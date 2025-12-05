import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  dataSource?: string;
  metric?: string;
  filters?: Record<string, unknown>;
  aggregation?: string;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  displayOptions?: Record<string, unknown>;
  showTarget?: boolean;
  targetValue?: number;
}

interface DashboardLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

interface DashboardRequest {
  id?: string;
  name: string;
  layout: DashboardLayout[];
  widgets: Record<string, DashboardWidget>;
}

interface Dashboard {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  layout: DashboardLayout[];
  is_default: boolean;
  created_at: string;
}

// GET - List dashboards or get specific dashboard
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    if (dashboardId) {
      // Get specific dashboard with widgets
      const dashboardResult = await query<Dashboard>(
        `SELECT id, tenant_id, name, slug, layout, is_default, created_at
         FROM tenant_dashboards WHERE id = $1 AND tenant_id = $2`,
        [dashboardId, tenantId]
      );

      if (dashboardResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Dashboard not found' },
          { status: 404 }
        );
      }

      const dashboard = dashboardResult.rows[0];

      // Get widgets
      const widgetsResult = await query<{
        id: string;
        widget_type: string;
        title: string;
        subtitle: string | null;
        grid_position: DashboardLayout;
        data_source: string | null;
        metric: string | null;
        filters: Record<string, unknown>;
        aggregation: string;
        group_by: string | null;
        sort_by: string | null;
        sort_order: string;
        limit_rows: number | null;
        display_options: Record<string, unknown>;
        show_target: boolean;
        target_value: number | null;
      }>(
        `SELECT id, widget_type, title, subtitle, grid_position,
                data_source, metric, filters, aggregation,
                group_by, sort_by, sort_order, limit_rows,
                display_options, show_target, target_value
         FROM tenant_dashboard_widgets WHERE dashboard_id = $1`,
        [dashboardId]
      );

      // Convert to expected format
      const widgets: Record<string, DashboardWidget> = {};
      widgetsResult.rows.forEach((w) => {
        widgets[w.id] = {
          id: w.id,
          type: w.widget_type,
          title: w.title,
          subtitle: w.subtitle || undefined,
          dataSource: w.data_source || undefined,
          metric: w.metric || undefined,
          filters: w.filters,
          aggregation: w.aggregation,
          groupBy: w.group_by || undefined,
          sortBy: w.sort_by || undefined,
          sortOrder: (w.sort_order as 'asc' | 'desc') || 'desc',
          limit: w.limit_rows || undefined,
          displayOptions: w.display_options,
          showTarget: w.show_target,
          targetValue: w.target_value || undefined,
        };
      });

      return NextResponse.json({
        dashboard: {
          id: dashboard.id,
          name: dashboard.name,
          layout: dashboard.layout,
          widgets,
        },
      });
    }

    // List all dashboards
    const result = await query<Dashboard>(
      `SELECT id, tenant_id, name, slug, layout, is_default, created_at
       FROM tenant_dashboards WHERE tenant_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [tenantId]
    );

    return NextResponse.json({ dashboards: result.rows });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboards' },
      { status: 500 }
    );
  }
}

// POST - Create or update dashboard
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    const body: DashboardRequest = await request.json();
    const { id, name, layout, widgets } = body;

    const result = await transaction(async (client) => {
      let dashboardId = id;
      let isNew = false;

      if (!dashboardId || dashboardId === 'new') {
        // Create new dashboard
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50);

        const createResult = await client.query<{ id: string }>(
          `INSERT INTO tenant_dashboards (tenant_id, name, slug, layout)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [tenantId, name, slug + '-' + Date.now(), JSON.stringify(layout)]
        );

        dashboardId = createResult.rows[0].id;
        isNew = true;
      } else {
        // Update existing dashboard
        await client.query(
          `UPDATE tenant_dashboards SET name = $1, layout = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 AND tenant_id = $4`,
          [name, JSON.stringify(layout), dashboardId, tenantId]
        );

        // Delete existing widgets
        await client.query(
          'DELETE FROM tenant_dashboard_widgets WHERE dashboard_id = $1',
          [dashboardId]
        );
      }

      // Insert widgets
      for (const [widgetId, widget] of Object.entries(widgets)) {
        const layoutItem = layout.find((l) => l.i === widgetId);

        await client.query(
          `INSERT INTO tenant_dashboard_widgets (
            id, dashboard_id, widget_type, title, subtitle, grid_position,
            data_source, metric, filters, aggregation, group_by, sort_by,
            sort_order, limit_rows, display_options, show_target, target_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            widgetId,
            dashboardId,
            widget.type,
            widget.title,
            widget.subtitle || null,
            JSON.stringify(layoutItem || { i: widgetId, x: 0, y: 0, w: 3, h: 2 }),
            widget.dataSource || null,
            widget.metric || null,
            JSON.stringify(widget.filters || {}),
            widget.aggregation || 'sum',
            widget.groupBy || null,
            widget.sortBy || null,
            widget.sortOrder || 'desc',
            widget.limit || null,
            JSON.stringify(widget.displayOptions || {}),
            widget.showTarget || false,
            widget.targetValue || null,
          ]
        );
      }

      return { dashboardId, isNew };
    });

    // Fetch the updated dashboard
    const dashboardResult = await query<Dashboard>(
      `SELECT id, name, layout FROM tenant_dashboards WHERE id = $1`,
      [result.dashboardId]
    );

    return NextResponse.json({
      success: true,
      dashboard: {
        id: dashboardResult.rows[0].id,
        name: dashboardResult.rows[0].name,
        layout: dashboardResult.rows[0].layout,
        widgets,
      },
    });
  } catch (error) {
    console.error('Error saving dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard' },
      { status: 500 }
    );
  }
}

// DELETE - Delete dashboard
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 401 }
      );
    }

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'Dashboard ID required' },
        { status: 400 }
      );
    }

    // Check if it's the default dashboard
    const checkResult = await query<{ is_default: boolean }>(
      'SELECT is_default FROM tenant_dashboards WHERE id = $1 AND tenant_id = $2',
      [dashboardId, tenantId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    if (checkResult.rows[0].is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default dashboard' },
        { status: 400 }
      );
    }

    await query(
      'DELETE FROM tenant_dashboards WHERE id = $1 AND tenant_id = $2',
      [dashboardId, tenantId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
}

// src/lib/config-service.ts
// Reads and writes company configuration from the database.
// All hardcoded business-specific values should come through here.

import { Pool } from 'pg';

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
}) : null;

// ── Company Config (key-value) ──────────────────────────────

export async function getConfig(key: string): Promise<string | null> {
  if (!pool) return null;
  const result = await pool.query(
    'SELECT config_value, config_type FROM company_config WHERE config_key = $1',
    [key]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].config_value;
}

export async function getConfigTyped(key: string): Promise<string | number | boolean | object | null> {
  if (!pool) return null;
  const result = await pool.query(
    'SELECT config_value, config_type FROM company_config WHERE config_key = $1',
    [key]
  );
  if (result.rows.length === 0) return null;
  const { config_value, config_type } = result.rows[0];
  switch (config_type) {
    case 'number': return Number(config_value);
    case 'boolean': return config_value === 'true';
    case 'json': return JSON.parse(config_value);
    default: return config_value;
  }
}

export async function getAllConfig(includeSensitive = false): Promise<Record<string, string>> {
  if (!pool) return {};
  const query = includeSensitive
    ? 'SELECT config_key, config_value FROM company_config'
    : "SELECT config_key, config_value FROM company_config WHERE is_sensitive = false";
  const result = await pool.query(query);
  const config: Record<string, string> = {};
  for (const row of result.rows) {
    config[row.config_key] = row.config_value;
  }
  return config;
}

export async function setConfig(key: string, value: string, updatedBy = 'system'): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO company_config (config_key, config_value, updated_at, updated_by)
     VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
     ON CONFLICT (config_key) DO UPDATE SET
       config_value = EXCLUDED.config_value,
       updated_at = CURRENT_TIMESTAMP,
       updated_by = EXCLUDED.updated_by`,
    [key, value, updatedBy]
  );
}

export async function setConfigs(entries: Record<string, string>, updatedBy = 'system'): Promise<void> {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(entries)) {
      await client.query(
        `INSERT INTO company_config (config_key, config_value, updated_at, updated_by)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
         ON CONFLICT (config_key) DO UPDATE SET
           config_value = EXCLUDED.config_value,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = EXCLUDED.updated_by`,
        [key, value, updatedBy]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── Divisions ───────────────────────────────────────────────

export interface Division {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
  hasTechnicians: boolean;
  hasComfortAdvisors: boolean;
}

export async function getDivisions(activeOnly = true): Promise<Division[]> {
  if (!pool) return [];
  const where = activeOnly ? 'WHERE is_active = true' : '';
  const result = await pool.query(
    `SELECT id, name, slug, icon, color, display_order, is_active,
            has_technicians, has_comfort_advisors
     FROM divisions ${where} ORDER BY display_order, name`
  );
  return result.rows.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    icon: r.icon,
    color: r.color,
    displayOrder: r.display_order,
    isActive: r.is_active,
    hasTechnicians: r.has_technicians,
    hasComfortAdvisors: r.has_comfort_advisors,
  }));
}

export async function createDivision(div: Omit<Division, 'id'>): Promise<Division> {
  if (!pool) throw new Error('Database not configured');
  const result = await pool.query(
    `INSERT INTO divisions (name, slug, icon, color, display_order, is_active, has_technicians, has_comfort_advisors)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [div.name, div.slug, div.icon, div.color, div.displayOrder, div.isActive, div.hasTechnicians, div.hasComfortAdvisors]
  );
  return { ...div, id: result.rows[0].id };
}

export async function updateDivision(id: number, div: Partial<Division>): Promise<void> {
  if (!pool) return;
  const fields: string[] = [];
  const values: (string | number | boolean)[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    name: 'name', slug: 'slug', icon: 'icon', color: 'color',
    displayOrder: 'display_order', isActive: 'is_active',
    hasTechnicians: 'has_technicians', hasComfortAdvisors: 'has_comfort_advisors',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in div) {
      fields.push(`${col} = $${idx++}`);
      values.push((div as Record<string, string | number | boolean>)[key]);
    }
  }

  if (fields.length === 0) return;
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);
  await pool.query(
    `UPDATE divisions SET ${fields.join(', ')} WHERE id = $${idx}`,
    values
  );
}

export async function deleteDivision(id: number): Promise<void> {
  if (!pool) return;
  await pool.query('DELETE FROM divisions WHERE id = $1', [id]);
}

// ── Business Units ──────────────────────────────────────────

export interface BusinessUnit {
  id: number;
  divisionId: number;
  servicetitanId: string | null;
  name: string;
  isActive: boolean;
  divisionName?: string;
}

export async function getBusinessUnits(divisionId?: number): Promise<BusinessUnit[]> {
  if (!pool) return [];
  let query = `
    SELECT bu.id, bu.division_id, bu.servicetitan_id, bu.name, bu.is_active, d.name as division_name
    FROM business_units bu
    LEFT JOIN divisions d ON d.id = bu.division_id
  `;
  const params: number[] = [];
  if (divisionId) {
    query += ' WHERE bu.division_id = $1';
    params.push(divisionId);
  }
  query += ' ORDER BY d.display_order, bu.name';
  const result = await pool.query(query, params);
  return result.rows.map(r => ({
    id: r.id,
    divisionId: r.division_id,
    servicetitanId: r.servicetitan_id,
    name: r.name,
    isActive: r.is_active,
    divisionName: r.division_name,
  }));
}

export async function saveBusinessUnits(units: { divisionId: number; servicetitanId: string; name: string }[]): Promise<void> {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const unit of units) {
      await client.query(
        `INSERT INTO business_units (division_id, servicetitan_id, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (servicetitan_id) DO UPDATE SET
           division_id = EXCLUDED.division_id,
           name = EXCLUDED.name,
           updated_at = CURRENT_TIMESTAMP`,
        [unit.divisionId, unit.servicetitanId, unit.name]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── Job Types ───────────────────────────────────────────────

export interface JobType {
  id: number;
  businessUnitId: number;
  servicetitanId: string | null;
  name: string;
  isActive: boolean;
}

export async function getJobTypes(businessUnitId?: number): Promise<JobType[]> {
  if (!pool) return [];
  let query = 'SELECT id, business_unit_id, servicetitan_id, name, is_active FROM job_types';
  const params: number[] = [];
  if (businessUnitId) {
    query += ' WHERE business_unit_id = $1';
    params.push(businessUnitId);
  }
  query += ' ORDER BY name';
  const result = await pool.query(query, params);
  return result.rows.map(r => ({
    id: r.id,
    businessUnitId: r.business_unit_id,
    servicetitanId: r.servicetitan_id,
    name: r.name,
    isActive: r.is_active,
  }));
}

// ── Report Config ───────────────────────────────────────────

export interface ReportConfig {
  id: number;
  reportKey: string;
  reportName: string;
  servicetitanReportId: string;
  reportCategory: string;
  description: string | null;
  divisionId: number | null;
  isActive: boolean;
  businessUnitIds: string | null;
}

export async function getReportConfigs(): Promise<ReportConfig[]> {
  if (!pool) return [];
  const result = await pool.query(
    'SELECT id, report_key, report_name, servicetitan_report_id, report_category, description, division_id, is_active, business_unit_ids FROM report_config ORDER BY report_key'
  );
  return result.rows.map(r => ({
    id: r.id,
    reportKey: r.report_key,
    reportName: r.report_name,
    servicetitanReportId: r.servicetitan_report_id,
    reportCategory: r.report_category,
    description: r.description,
    divisionId: r.division_id,
    isActive: r.is_active,
    businessUnitIds: r.business_unit_ids,
  }));
}

export async function updateReportConfig(reportKey: string, updates: Partial<ReportConfig>): Promise<void> {
  if (!pool) return;
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let idx = 1;

  if (updates.servicetitanReportId !== undefined) { fields.push(`servicetitan_report_id = $${idx++}`); values.push(updates.servicetitanReportId); }
  if (updates.reportName !== undefined) { fields.push(`report_name = $${idx++}`); values.push(updates.reportName); }
  if (updates.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(updates.isActive); }
  if (updates.divisionId !== undefined) { fields.push(`division_id = $${idx++}`); values.push(updates.divisionId); }
  if (updates.businessUnitIds !== undefined) { fields.push(`business_unit_ids = $${idx++}`); values.push(updates.businessUnitIds); }

  if (fields.length === 0) return;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(reportKey);
  await pool.query(`UPDATE report_config SET ${fields.join(', ')} WHERE report_key = $${idx}`, values);
}

// ── Google Locations ────────────────────────────────────────

export interface GoogleLocation {
  id: number;
  name: string;
  accountId: string;
  locationId: string;
  slug: string;
  isActive: boolean;
}

export async function getGoogleLocations(): Promise<GoogleLocation[]> {
  if (!pool) return [];
  const result = await pool.query(
    'SELECT id, name, account_id, location_id, slug, is_active FROM google_locations WHERE is_active = true ORDER BY name'
  );
  return result.rows.map(r => ({
    id: r.id,
    name: r.name,
    accountId: r.account_id,
    locationId: r.location_id,
    slug: r.slug,
    isActive: r.is_active,
  }));
}

export async function saveGoogleLocation(loc: Omit<GoogleLocation, 'id'>): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO google_locations (name, account_id, location_id, slug, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       account_id = EXCLUDED.account_id,
       location_id = EXCLUDED.location_id,
       is_active = EXCLUDED.is_active,
       updated_at = CURRENT_TIMESTAMP`,
    [loc.name, loc.accountId, loc.locationId, loc.slug, loc.isActive]
  );
}

// ── Setup Status ────────────────────────────────────────────

export async function isSetupComplete(): Promise<boolean> {
  const val = await getConfig('setup_completed');
  return val === 'true';
}

export async function getSetupStep(): Promise<number> {
  const val = await getConfig('setup_step');
  return val ? Number(val) : 1;
}

export async function logSetupStep(step: number, stepName: string, status: string, details?: object, createdBy = 'admin'): Promise<void> {
  if (!pool) return;
  await pool.query(
    'INSERT INTO setup_log (step, step_name, status, details, created_by) VALUES ($1, $2, $3, $4, $5)',
    [step, stepName, status, details ? JSON.stringify(details) : null, createdBy]
  );
}

// ── Helper: Build Division → BU mapping for sync engine ─────

export async function getDivisionBusinessUnitMapping(): Promise<Record<string, string>> {
  if (!pool) return {};
  const result = await pool.query(`
    SELECT bu.name as bu_name, d.slug as division_slug
    FROM business_units bu
    JOIN divisions d ON d.id = bu.division_id
    WHERE bu.is_active = true AND d.is_active = true
  `);
  const mapping: Record<string, string> = {};
  for (const row of result.rows) {
    mapping[row.bu_name] = row.division_slug;
  }
  return mapping;
}

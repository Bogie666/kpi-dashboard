// Competition API helper functions

const API_BASE = process.env.NEXT_PUBLIC_COMPETITION_API_URL ||
  'https://us-central1-new-dashboard-2025.cloudfunctions.net/competition-api';

export const competitionApi = {
  // Get all competitions
  async getCompetitions() {
    const response = await fetch(`${API_BASE}/competitions`);
    return response.json();
  },

  // Get specific competition
  async getCompetition(competitionId) {
    const response = await fetch(`${API_BASE}/competitions/${competitionId}`);
    return response.json();
  },

  // Create competition
  async createCompetition(competitionData) {
    const response = await fetch(`${API_BASE}/competitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(competitionData),
    });
    return response.json();
  },

  // Update competition
  async updateCompetition(competitionId, competitionData) {
    const response = await fetch(`${API_BASE}/competitions/${competitionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(competitionData),
    });
    return response.json();
  },

  // Delete competition
  async deleteCompetition(competitionId) {
    const response = await fetch(`${API_BASE}/competitions/${competitionId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // Get leaderboard
  async getLeaderboard(competitionId) {
    const response = await fetch(`${API_BASE}/competitions/${competitionId}/leaderboard`);
    return response.json();
  },

  // Update leaderboard entry
  async updateLeaderboardEntry(competitionId, techId, entryData) {
    const response = await fetch(
      `${API_BASE}/competitions/${competitionId}/leaderboard/${techId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      }
    );
    return response.json();
  },

  // Sync competition data from ServiceTitan and Google
  async syncCompetitionData(competitionId) {
    const response = await fetch(`${API_BASE}/competitions/${competitionId}/sync`, {
      method: 'POST',
    });
    return response.json();
  },

  // Get Google reviews for competition period
  async getReviewsForPeriod(startDate, endDate) {
    const response = await fetch(
      `${API_BASE}/google-reviews/competition-period?startDate=${startDate}&endDate=${endDate}`
    );
    return response.json();
  },
};

// Get technician photos from existing photo API
const PHOTO_API_BASE = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/photo-api';

export const technicianPhotoApi = {
  // Get all technician photos
  async getPhotos() {
    const response = await fetch(`${PHOTO_API_BASE}/photos`);
    return response.json();
  },

  // Get photo for specific technician
  async getPhotoByName(techName) {
    const response = await fetch(`${PHOTO_API_BASE}/photos`);
    const data = await response.json();

    if (data.status === 'success' && data.data) {
      // Find photo matching technician name
      const photo = data.data.find(p =>
        p.name.toLowerCase() === techName.toLowerCase()
      );
      return photo?.photo_url || null;
    }
    return null;
  },

  // Get photo URL by technician ID (if you have IDs)
  async getPhotoById(techId) {
    const response = await fetch(`${PHOTO_API_BASE}/photos/${techId}`);
    const data = await response.json();
    return data.status === 'success' ? data.data?.photo_url : null;
  },
};

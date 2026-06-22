import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Erro ao carregar token:', error);
    }
  }

  private async getHeaders(includeAuth = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      if (!this.token) {
        await this.loadToken();
      }
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
    }

    return headers;
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Erro desconhecido',
      }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // Auth
  async register(email: string, password: string, name: string) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: await this.getHeaders(false),
      body: JSON.stringify({ email, password, name }),
    });

    const data = await this.handleResponse(response);
    await this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: await this.getHeaders(false),
      body: JSON.stringify({ email, password }),
    });

    const data = await this.handleResponse(response);
    await this.setToken(data.token);
    return data;
  }

  async getProfile() {
    const response = await fetch(`${this.baseUrl}/auth/profile`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async logout() {
    await this.clearToken();
    this.token = null;
  }

  // Reports
  async createReport(data: {
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    category: string;
    severity: string;
    image?: string;
  }) {
    const formData = new FormData();
    formData.append('data', JSON.stringify({
      title: data.title,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      category: data.category,
      severity: data.severity,
    }));

    if (data.image) {
      const imageName = data.image.split('/').pop() || 'image.jpg';
      formData.append('file', {
        uri: data.image,
        type: 'image/jpeg',
        name: imageName,
      } as any);
    }

    const headers = await this.getHeaders();
    delete headers['Content-Type'];

    const response = await fetch(`${this.baseUrl}/reports`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse(response);
  }

  async getMyReports() {
    const response = await fetch(`${this.baseUrl}/reports/my-reports`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getAllReports(limit = 50, offset = 0) {
    const response = await fetch(
      `${this.baseUrl}/reports?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: await this.getHeaders(false),
      }
    );

    return this.handleResponse(response);
  }

  async getReport(id: string) {
    const response = await fetch(`${this.baseUrl}/reports/${id}`, {
      method: 'GET',
      headers: await this.getHeaders(false),
    });

    return this.handleResponse(response);
  }

  async updateReport(id: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    severity: string;
  }>) {
    const response = await fetch(`${this.baseUrl}/reports/${id}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse(response);
  }

  async deleteReport(id: string) {
    const response = await fetch(`${this.baseUrl}/reports/${id}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // Danger Zones
  async getAllDangerZones() {
    const response = await fetch(`${this.baseUrl}/danger-zones`, {
      method: 'GET',
      headers: await this.getHeaders(false),
    });

    return this.handleResponse(response);
  }

  async getActiveDangerZones() {
    const response = await fetch(`${this.baseUrl}/danger-zones/active/all`, {
      method: 'GET',
      headers: await this.getHeaders(false),
    });

    return this.handleResponse(response);
  }

  async getDangerZone(id: string) {
    const response = await fetch(`${this.baseUrl}/danger-zones/${id}`, {
      method: 'GET',
      headers: await this.getHeaders(false),
    });

    return this.handleResponse(response);
  }

  // Security Analyses
  async getAllSecurityAnalyses() {
    const response = await fetch(`${this.baseUrl}/security-analyses`, {
      method: 'GET',
      headers: await this.getHeaders(false),
    });

    return this.handleResponse(response);
  }

  async getSecurityAnalysis(id: string) {
    const response = await fetch(`${this.baseUrl}/security-analyses/${id}`, {
      method: 'GET',
      headers: await this.getHeaders(false),
    });

    return this.handleResponse(response);
  }

  async getSecurityAnalysesByZone(zoneId: string) {
    const response = await fetch(
      `${this.baseUrl}/security-analyses/by-zone/${zoneId}`,
      {
        method: 'GET',
        headers: await this.getHeaders(false),
      }
    );

    return this.handleResponse(response);
  }

  // Token management
  async setToken(token: string) {
    this.token = token;
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Erro ao salvar token:', error);
    }
  }

  async clearToken() {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Erro ao limpar token:', error);
    }
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiClient = new ApiClient();

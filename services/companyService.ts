import API_CONFIG from '../app/config/api';
import { Company } from '../types/company';
import api from './api';

class CompanyService {
  private toAbsoluteUrl(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${API_CONFIG.BASE_URL}${path}`;
  }

  async getCompany(): Promise<Company> {
    const response = await api.get('/api/getCompanyById');
    const company: Company = response.data;
    return { ...company, logo: this.toAbsoluteUrl(company.logo) };
  }

  async updateCompany(companyData: Partial<Company>, logoUri?: string | null): Promise<Company> {
    let requestBody: FormData | object;
    let headers: Record<string, string> | undefined;

    if (logoUri) {
      // Use FormData for multipart/form-data
      const formData = new FormData();
      formData.append('title', companyData.title || '');
      if (companyData.description) formData.append('description', companyData.description);
      formData.append('email', companyData.email || '');
      if (companyData.foundedYear) formData.append('foundedYear', companyData.foundedYear.toString());
      
      // Add sector data if it exists
      if (companyData.sector) {
        formData.append('sector', JSON.stringify({
          phone1: companyData.sector.phone1 || null,
          phone2: companyData.sector.phone2 || null,
          website: companyData.sector.website || null,
          email2: companyData.sector.email2 || null,
        }));
      }

      // Add logo file
      const logoBlob = {
        uri: logoUri,
        type: 'image/jpeg',
        name: 'logo.jpg',
      } as any;
      formData.append('logo', logoBlob);

      requestBody = formData;
      // Don't set Content-Type for FormData, let axios handle it
      headers = undefined;
    } else {
      // Use JSON for regular update without logo
      requestBody = companyData;
      headers = {
        'Content-Type': 'application/json',
      };
    }

    const response = await api.put('/api/updateCompany', requestBody, {
      headers,
    });
    
    const company: Company = response.data;
    return { ...company, logo: this.toAbsoluteUrl(company.logo) };
  }
}

const companyService = new CompanyService();
export default companyService;

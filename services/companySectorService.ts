import api from "./api";

export interface CompanySector {
  id: string;
  sector: string;
}

class CompanySectorService {
  async getAllSectors(): Promise<CompanySector[]> {
    const response = await api.get("/api/companysector");
    return response.data;
  }
}

const companySectorService = new CompanySectorService();
export default companySectorService;

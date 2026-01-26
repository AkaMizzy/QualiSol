import API_CONFIG from "../app/config/api";
import { Company } from "../types/company";
import api from "./api";

class CompanyService {
  private toAbsoluteUrl(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return `${API_CONFIG.BASE_URL}${path}`;
  }

  async getCompany(token?: string): Promise<Company> {
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined;
    const response = await api.get("/api/company/getCompanyById", config);
    const company: Company = response.data;
    return { ...company, logo: this.toAbsoluteUrl(company.logo) };
  }

  async updateCompany(
    companyData: Partial<Company>,
    logoUri?: string | null,
  ): Promise<Company> {
    let requestBody: FormData | object;
    let headers: Record<string, string> | undefined;

    if (logoUri) {
      const formData = new FormData();
      Object.keys(companyData).forEach((key) => {
        const value = companyData[key as keyof Partial<Company>];
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      const logoBlob = {
        uri: logoUri,
        type: "image/jpeg",
        name: "logo.jpg",
      } as any;
      formData.append("logo", logoBlob);

      requestBody = formData;
      headers = undefined;
    } else {
      requestBody = companyData;
      headers = {
        "Content-Type": "application/json",
      };
    }

    const response = await api.put(`/api/company/updateCompany`, requestBody, {
      headers,
    });

    const company: Company = response.data.data;
    return { ...company, logo: this.toAbsoluteUrl(company.logo) };
  }

  async uploadCompanyLogo(
    companyId: string,
    authorName: string,
    logoUri: string,
  ): Promise<Company> {
    const formData = new FormData();

    const uriSegments = logoUri.split(/[\\\/]/);
    const fullFileName = uriSegments[uriSegments.length - 1];

    const fileNameParts = fullFileName.split(".");
    const ext =
      fileNameParts.length > 1 ? fileNameParts.pop()!.toLowerCase() : "jpeg";
    const title = fileNameParts.join(".");

    const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;

    formData.append("file", {
      uri: logoUri,
      name: fullFileName,
      type: mimeType,
    } as any);

    formData.append("idsource", companyId);
    formData.append("title", title);
    formData.append("kind", "logo");
    formData.append("author", authorName);
    formData.append("updateCompanyLogo", "true");

    await api.post("/api/geds/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const company = await this.getCompany();
    return { ...company, logo: this.toAbsoluteUrl(company.logo) } as Company;
  }
}

const companyService = new CompanyService();
export default companyService;

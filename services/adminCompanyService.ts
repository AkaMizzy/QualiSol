import api from "./api";

export interface CreateCompanyInput {
  title: string;
  email: string;
  phone: string;
  pays: string;
  ville: string;
}

export interface CreateCompanyResult {
  success: boolean;
  error?: string;
}


export async function adminCreateCompany(
  data: CreateCompanyInput,
): Promise<CreateCompanyResult> {
  try {
    const payload = {
      title: data.title,
      email: data.email,
      phone: data.phone,
      country: data.pays,
      city: data.ville,
    };

    await api.post("/api/company/internal/create", payload);
    return { success: true };
  } catch (err: any) {
    const message =
      err?.response?.data?.error ||
      "Une erreur est survenue lors de la création de l'organisme.";
    return { success: false, error: message };
  }
}

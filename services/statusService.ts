import api from "./api";

export interface Status {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const getAllStatuses = async (token: string): Promise<Status[]> => {
  try {
    const response = await api.get("/api/status", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch statuses:", error);
    throw error;
  }
};

// Get the ID of the Inactive status
export const getInactiveStatusId = async (
  token: string,
): Promise<string | null> => {
  try {
    const statuses = await getAllStatuses(token);
    const inactiveStatus = statuses.find((s) => s.status === "Inactive");
    return inactiveStatus?.id || null;
  } catch (error) {
    console.error("Failed to get Inactive status:", error);
    throw error;
  }
};

// Get the ID of the Pending (active) status
export const getPendingStatusId = async (
  token: string,
): Promise<string | null> => {
  try {
    const statuses = await getAllStatuses(token);
    const pendingStatus = statuses.find((s) => s.status === "Pending");
    return pendingStatus?.id || null;
  } catch (error) {
    console.error("Failed to get Pending status:", error);
    throw error;
  }
};

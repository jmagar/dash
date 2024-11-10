import axios from 'axios';

import { ApiResult, Command, CommandResult } from '../types';
import { handleApiError, API_ENDPOINTS, BASE_URL } from '../types/api';

export const executeCommand = async (
  hostId: number,
  command: Command,
): Promise<ApiResult<CommandResult>> => {
  try {
    const { data } = await axios.post<CommandResult>(
      `${BASE_URL}${API_ENDPOINTS.EXECUTE.COMMAND(hostId)}`,
      command,
    );
    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleApiError<CommandResult>(error);
  }
};

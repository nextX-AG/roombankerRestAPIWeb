import { api, ApiResponse } from './api';

export interface Flow {
  id?: string;
  name: string;
  type?: string;  // For API compatibility
  flow_type: 'gateway_flow' | 'device_flow';  // For frontend use
  version: number;
  steps: Array<{
    id: string;
    type: 'filter' | 'transform' | 'forward' | 'conditional';
    config: Record<string, any>;
    position: number;
  }>;
}

export interface FlowTestResult {
  success: boolean;
  steps_executed: Array<{
    step: number;
    type: string;
    result: string;
    details?: Record<string, any>;
  }>;
  error?: string;
  output?: any;
}

export interface FlowGroup {
  id?: string;
  name: string;
  flows: Array<{
    flow_id: string;
    priority: number;
  }>;
}

export const flowApi = {
  // Flow CRUD Operationen
  list: async (): Promise<ApiResponse<Flow[]>> => {
    return api.get('/v1/flows');
  },

  getById: async (id: string): Promise<ApiResponse<Flow>> => {
    return api.get(`/v1/flows/${id}`);
  },

  create: async (flow: Omit<Flow, 'id'>): Promise<ApiResponse<Flow>> => {
    return api.post('/v1/flows', flow);
  },

  update: async (id: string, flow: Flow): Promise<ApiResponse<Flow>> => {
    return api.put(`/v1/flows/${id}`, flow);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/v1/flows/${id}`);
  },

  // Flow-Test
  test: async (flowId: string, testMessage: any): Promise<ApiResponse<FlowTestResult>> => {
    return api.post(`/v1/flows/${flowId}/test`, {
      message: testMessage
    });
  },

  // Flow-Gruppen
  listGroups: async (): Promise<ApiResponse<FlowGroup[]>> => {
    return api.get('/v1/flow-groups');
  },

  createGroup: async (group: Omit<FlowGroup, 'id'>): Promise<ApiResponse<FlowGroup>> => {
    return api.post('/v1/flow-groups', group);
  },

  updateGroup: async (id: string, group: FlowGroup): Promise<ApiResponse<FlowGroup>> => {
    return api.put(`/v1/flow-groups/${id}`, group);
  },

  deleteGroup: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/v1/flow-groups/${id}`);
  },

  // Flow-Zuordnungen
  assignToGateway: async (gatewayId: string, flowId: string): Promise<ApiResponse<void>> => {
    return api.post(`/v1/gateways/${gatewayId}/flow`, { flow_id: flowId });
  },

  assignToDevice: async (deviceId: string, flowId: string): Promise<ApiResponse<void>> => {
    return api.post(`/v1/devices/${deviceId}/flow`, { flow_id: flowId });
  },

  // Flow-Gruppen-Zuordnungen
  assignGroupToGateway: async (gatewayId: string, groupId: string): Promise<ApiResponse<void>> => {
    return api.post(`/v1/gateways/${gatewayId}/flow-group`, { group_id: groupId });
  },

  assignGroupToDevice: async (deviceId: string, groupId: string): Promise<ApiResponse<void>> => {
    return api.post(`/v1/devices/${deviceId}/flow-group`, { group_id: groupId });
  }
}; 
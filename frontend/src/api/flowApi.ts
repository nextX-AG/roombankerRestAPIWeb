import { api } from './api';

export interface Flow {
  id?: string;
  name: string;
  flow_type: 'gateway_flow' | 'device_flow';
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

export const flowApi = {
  // Flow CRUD Operationen
  list: async () => {
    return api.get<Flow[]>('/api/v1/flows');
  },

  getById: async (id: string) => {
    return api.get<Flow>(`/api/v1/flows/${id}`);
  },

  create: async (flow: Omit<Flow, 'id'>) => {
    return api.post<Flow>('/api/v1/flows', flow);
  },

  update: async (id: string, flow: Flow) => {
    return api.put<Flow>(`/api/v1/flows/${id}`, flow);
  },

  delete: async (id: string) => {
    return api.delete(`/api/v1/flows/${id}`);
  },

  // Flow-Test
  test: async (flowId: string, testMessage: any) => {
    return api.post<FlowTestResult>(`/api/v1/flows/${flowId}/test`, {
      message: testMessage
    });
  },

  // Flow-Gruppen
  listGroups: async () => {
    return api.get('/api/v1/flow-groups');
  },

  createGroup: async (group: { name: string; flows: Array<{ flow_id: string; priority: number }> }) => {
    return api.post('/api/v1/flow-groups', group);
  },

  updateGroup: async (id: string, group: { name: string; flows: Array<{ flow_id: string; priority: number }> }) => {
    return api.put(`/api/v1/flow-groups/${id}`, group);
  },

  deleteGroup: async (id: string) => {
    return api.delete(`/api/v1/flow-groups/${id}`);
  },

  // Flow-Zuordnungen
  assignToGateway: async (gatewayId: string, flowId: string) => {
    return api.post(`/api/v1/gateways/${gatewayId}/flow`, { flow_id: flowId });
  },

  assignToDevice: async (deviceId: string, flowId: string) => {
    return api.post(`/api/v1/devices/${deviceId}/flow`, { flow_id: flowId });
  },

  // Flow-Gruppen-Zuordnungen
  assignGroupToGateway: async (gatewayId: string, groupId: string) => {
    return api.post(`/api/v1/gateways/${gatewayId}/flow-group`, { group_id: groupId });
  },

  assignGroupToDevice: async (deviceId: string, groupId: string) => {
    return api.post(`/api/v1/devices/${deviceId}/flow-group`, { group_id: groupId });
  }
}; 
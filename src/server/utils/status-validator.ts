import { 
  Status, 
  ServiceStatus, 
  HostStatus, 
  AgentStatus, 
  ProcessStatus,
  StatusValidationResult,
  StatusValidator 
} from '../../types/status';

/**
 * Validates if a status is a valid ServiceStatus
 */
export const validateServiceStatus: StatusValidator = (status: Status): StatusValidationResult => {
  const isValid = Object.values(ServiceStatus).includes(status as ServiceStatus);
  return {
    isValid,
    status,
    message: isValid ? undefined : `Invalid service status: ${status}`,
    code: isValid ? undefined : 'INVALID_SERVICE_STATUS'
  };
};

/**
 * Validates if a status is a valid HostStatus
 */
export const validateHostStatus: StatusValidator = (status: Status): StatusValidationResult => {
  const isValid = Object.values(HostStatus).includes(status as HostStatus);
  return {
    isValid,
    status,
    message: isValid ? undefined : `Invalid host status: ${status}`,
    code: isValid ? undefined : 'INVALID_HOST_STATUS'
  };
};

/**
 * Validates if a status is a valid AgentStatus
 */
export const validateAgentStatus: StatusValidator = (status: Status): StatusValidationResult => {
  const isValid = Object.values(AgentStatus).includes(status as AgentStatus);
  return {
    isValid,
    status,
    message: isValid ? undefined : `Invalid agent status: ${status}`,
    code: isValid ? undefined : 'INVALID_AGENT_STATUS'
  };
};

/**
 * Validates if a status is a valid ProcessStatus
 */
export const validateProcessStatus: StatusValidator = (status: Status): StatusValidationResult => {
  const isValid = Object.values(ProcessStatus).includes(status as ProcessStatus);
  return {
    isValid,
    status,
    message: isValid ? undefined : `Invalid process status: ${status}`,
    code: isValid ? undefined : 'INVALID_PROCESS_STATUS'
  };
};

/**
 * Status transition validation result
 */
export interface StatusTransitionResult extends StatusValidationResult {
  canTransition: boolean;
  fromStatus: Status;
  toStatus: Status;
}

/**
 * Validates if a status transition is allowed
 */
export const validateStatusTransition = (
  fromStatus: Status,
  toStatus: Status,
  allowedTransitions: Map<Status, Set<Status>>
): StatusTransitionResult => {
  const allowed = allowedTransitions.get(fromStatus);
  const canTransition = allowed ? allowed.has(toStatus) : false;

  return {
    isValid: canTransition,
    canTransition,
    status: toStatus,
    fromStatus,
    toStatus,
    message: canTransition ? undefined : `Invalid status transition from ${fromStatus} to ${toStatus}`,
    code: canTransition ? undefined : 'INVALID_STATUS_TRANSITION'
  };
};

/**
 * Creates a map of allowed status transitions
 */
export const createTransitionMap = <T extends Status>(transitions: Array<[T, T]>): Map<T, Set<T>> => {
  const map = new Map<T, Set<T>>();
  
  transitions.forEach(([from, to]) => {
    const allowed = map.get(from) || new Set<T>();
    allowed.add(to);
    map.set(from, allowed);
  });
  
  return map;
};

/**
 * Default allowed service status transitions
 */
export const defaultServiceTransitions = createTransitionMap<ServiceStatus>([
  [ServiceStatus.INACTIVE, ServiceStatus.STARTING],
  [ServiceStatus.STARTING, ServiceStatus.ACTIVE],
  [ServiceStatus.STARTING, ServiceStatus.ERROR],
  [ServiceStatus.ACTIVE, ServiceStatus.DEGRADED],
  [ServiceStatus.ACTIVE, ServiceStatus.STOPPING],
  [ServiceStatus.ACTIVE, ServiceStatus.ERROR],
  [ServiceStatus.DEGRADED, ServiceStatus.ACTIVE],
  [ServiceStatus.DEGRADED, ServiceStatus.STOPPING],
  [ServiceStatus.DEGRADED, ServiceStatus.ERROR],
  [ServiceStatus.STOPPING, ServiceStatus.INACTIVE],
  [ServiceStatus.STOPPING, ServiceStatus.ERROR],
  [ServiceStatus.ERROR, ServiceStatus.STOPPING],
  [ServiceStatus.ERROR, ServiceStatus.INACTIVE],
]);

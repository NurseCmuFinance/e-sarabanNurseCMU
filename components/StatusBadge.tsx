import React from 'react';
import { DocStatus } from '../types';
import { STATUS_CONFIG } from '../constants';

interface StatusBadgeProps {
  status: DocStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[DocStatus.REGISTERED];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
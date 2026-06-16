import React from 'react';
import { SOVLayout } from './CommonSOVTab';

export const ConnectedSOVTab = ({ workspaceId }) => {
  return (
    <SOVLayout 
      type="connected"
      title="Connected Sources SOV"
      description="Exclusively analyzes how YOUR specifically connected sources (your blogs, your Reddit profile) are contributing to the answers."
      metrics={null} // Enforce Zero Dummy Data
    />
  );
};

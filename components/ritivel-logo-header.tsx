import React from 'react';
import { RitivelLogo } from './logos/ritivel-logo';

export const RitivelLogoHeader = () => (
  <div className="flex items-center gap-2 my-1.5">
    <RitivelLogo className="size-6.5" />
    <h2 className="text-xl font-normal font-be-vietnam-pro bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 dark:from-blue-400 dark:via-blue-500 dark:to-blue-600 bg-clip-text text-transparent">ritivel</h2>
  </div>
);

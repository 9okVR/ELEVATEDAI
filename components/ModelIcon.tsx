
import React from 'react';
import type { AiModel } from '../types';
import GeminiLogo from './icons/GeminiLogo';

interface ModelIconProps {
  model: AiModel;
}

const ModelIcon: React.FC<ModelIconProps> = ({ model }) => {
    // Only Gemini 2.5 Pro is supported
    return <GeminiLogo className="w-6 h-6" animated={false} />;
};

export default ModelIcon;


import React from 'react';
import type { WebSource } from '../types';
import GlobeIcon from './icons/GlobeIcon';

interface WebSourcesProps {
  sources: WebSource[] | null;
}

const WebSources: React.FC<WebSourcesProps> = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-3 border-t border-gray-600/50">
      <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-2">
        <GlobeIcon className="w-4 h-4" />
        Web Sources
      </h4>
      <ul className="space-y-1">
        {sources.map((source, index) => (
          <li key={index} className="flex items-start">
            <span className="text-gray-500 mr-2 mt-1">&#8226;</span>
            <a
              href={source.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 text-sm hover:text-indigo-300 hover:underline transition-colors truncate"
              title={source.web.title}
            >
              {source.web.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WebSources;

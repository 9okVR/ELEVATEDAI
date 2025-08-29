import React from 'react';

const parseInline = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-bold text-purple-300">{part}</strong> : part
    );
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    if (!content) {
        return null;
    }

    const renderContent = () => {
        const lines = content.split('\n');
        const elements: React.ReactElement[] = [];
        let listType: 'ol' | 'ul' | null = null;
        let listItems: React.ReactElement[] = [];

        const flushList = () => {
            if (listItems.length > 0) {
                if (listType === 'ul') {
                    elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 pl-2">{listItems}</ul>);
                } else if (listType === 'ol') {
                    elements.push(<ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-1 my-2 pl-2">{listItems}</ol>);
                }
                listItems = [];
                listType = null;
            }
        };

        lines.forEach((line, index) => {
            if (line.startsWith('# ')) { flushList(); elements.push(<h1 key={index} className="text-2xl font-bold text-purple-400 mt-8 mb-4">{parseInline(line.substring(2))}</h1>); return; }
            if (line.startsWith('## ')) { flushList(); elements.push(<h2 key={index} className="text-xl font-bold text-purple-400 mt-6 mb-3">{parseInline(line.substring(3))}</h2>); return; }
            if (line.startsWith('### ')) { flushList(); elements.push(<h3 key={index} className="text-lg font-bold text-purple-300 mt-4 mb-2">{parseInline(line.substring(4))}</h3>); return; }
            
            const ulMatch = line.match(/^(\s*)\* (.*)/);
            if (ulMatch) {
                if (listType !== 'ul') { flushList(); listType = 'ul'; }
                listItems.push(<li key={index} className="text-gray-300">{parseInline(ulMatch[2])}</li>);
                return;
            }
            
            const olMatch = line.match(/^(\s*)\d+\. (.*)/);
            if (olMatch) {
                if (listType !== 'ol') { flushList(); listType = 'ol'; }
                listItems.push(<li key={index} className="text-gray-300">{parseInline(olMatch[2])}</li>);
                return;
            }
            
            flushList();

            if (line.trim() === '') {
                // To create paragraph breaks, we can check if the last element was a p
                if (elements.length > 0 && elements[elements.length -1].type === 'p') {
                     elements.push(<br key={`br-${index}`} />);
                }
            } else {
                elements.push(<p key={index} className="text-gray-300 leading-relaxed">{parseInline(line)}</p>);
            }
        });
        
        flushList();
        return elements;
    };
    
    return <div className="prose prose-invert max-w-none">{renderContent()}</div>;
};

export default MarkdownRenderer;
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
        let inCodeBlock = false;
        let codeLines: string[] = [];
        let codeLanguage = '';

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

        const flushCodeBlock = () => {
            if (codeLines.length > 0) {
                elements.push(
                    <div key={`code-${elements.length}`} className="my-4 rounded-lg overflow-hidden border border-purple-500/30 bg-gray-900/50">
                        {codeLanguage && (
                            <div className="px-4 py-2 bg-purple-600/20 border-b border-purple-500/30 text-xs font-medium text-purple-300">
                                {codeLanguage}
                            </div>
                        )}
                        <pre className="p-4 overflow-x-auto">
                            <code className="text-green-300 text-sm font-mono">
                                {codeLines.join('\n')}
                            </code>
                        </pre>
                    </div>
                );
                codeLines = [];
                codeLanguage = '';
            }
        };

        lines.forEach((line, index) => {
            // Handle code block start
            if (line.startsWith('```')) {
                flushList();
                if (!inCodeBlock) {
                    inCodeBlock = true;
                    codeLanguage = line.substring(3).trim() || 'code';
                } else {
                    inCodeBlock = false;
                    flushCodeBlock();
                }
                return;
            }

            // Handle lines inside code blocks
            if (inCodeBlock) {
                codeLines.push(line);
                return;
            }

            // Handle special output sections
            if (line.trim() === 'Output:' || line.trim().startsWith('Output:')) {
                flushList();
                elements.push(
                    <div key={index} className="my-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="text-blue-300 font-semibold text-sm mb-2">📊 Code Execution Result</div>
                        <div className="text-gray-300 text-sm italic">The AI executed code and generated output above</div>
                    </div>
                );
                return;
            }

            // Handle headers
            if (line.startsWith('# ')) { flushList(); elements.push(<h1 key={index} className="text-2xl font-bold text-purple-400 mt-8 mb-4">{parseInline(line.substring(2))}</h1>); return; }
            if (line.startsWith('## ')) { flushList(); elements.push(<h2 key={index} className="text-xl font-bold text-purple-400 mt-6 mb-3">{parseInline(line.substring(3))}</h2>); return; }
            if (line.startsWith('### ')) { flushList(); elements.push(<h3 key={index} className="text-lg font-bold text-purple-300 mt-4 mb-2">{parseInline(line.substring(4))}</h3>); return; }
            
            // Handle lists
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

            // Handle empty lines
            if (line.trim() === '') {
                if (elements.length > 0 && elements[elements.length -1].type === 'p') {
                     elements.push(<br key={`br-${index}`} />);
                }
            } else {
                elements.push(<p key={index} className="text-gray-300 leading-relaxed">{parseInline(line)}</p>);
            }
        });
        
        // Flush any remaining items
        flushList();
        flushCodeBlock();
        
        return elements;
    };
    
    return <div className="prose prose-invert max-w-none">{renderContent()}</div>;
};

export default MarkdownRenderer;
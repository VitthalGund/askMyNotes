import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const idRef = useRef<string>('');

  useEffect(() => {
    if (!idRef.current) {
        idRef.current = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
    }
    let isMounted = true;
    mermaid.render(idRef.current, chart).then((result) => {
      if (isMounted) setSvg(result.svg);
    }).catch(() => {
      // It will frequently fail while the typewriter animation is typing out the partial mermaid code block snippet
      if (isMounted) setSvg(`<div style="padding: 20px; color: var(--text-secondary); font-style: italic; border: 1px dashed var(--glass-border); border-radius: 8px;">✨ Drawing visualization...</div>`);
    });
    return () => { isMounted = false; };
  }, [chart]);

  return (
    <>
      <div style={{ position: 'relative', margin: '12px 0' }}>
        <div 
          dangerouslySetInnerHTML={{ __html: svg }} 
          style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8, overflowX: 'auto', textAlign: 'center' }} 
        />
        <button
          onClick={() => setIsFullscreen(true)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'var(--bg-primary)',
            border: '1px solid var(--glass-border)',
            borderRadius: 4,
            padding: '4px 8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 12
          }}
          title="View Fullscreen"
        >
          ⛶
        </button>
      </div>

      {isFullscreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'auto',
          padding: 24
        }}>
          <button
            onClick={() => setIsFullscreen(false)}
            style={{
              position: 'fixed',
              top: 24,
              right: 24,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid var(--glass-border)',
              borderRadius: '50%',
              width: 44,
              height: 44,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s',
              zIndex: 10000
            }}
            title="Close Fullscreen"
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            ✕
          </button>
          
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 40,
            width: '90vw',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden'
          }}>
             <div 
              dangerouslySetInnerHTML={{ __html: svg }} 
              style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }} 
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          const isMermaid = match && match[1] === 'mermaid';
          
          if (isMermaid) {
            return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
          }

          const isBlock = match || String(children).includes('\n');

          if (isBlock) {
             return (
               <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, overflowX: 'auto', margin: '8px 0' }}>
                 <code className={className} style={{ fontSize: '0.9em', whiteSpace: 'pre' }} {...rest}>
                   {children}
                 </code>
               </div>
             );
          }

          return (
            <code className={className} style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: 4, fontSize: '0.9em' }} {...rest}>
              {children}
            </code>
          );
        },
        a(props) {
            return <a {...props} style={{ color: 'var(--accent-3)', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer" />
        },
        ul(props) {
            return <ul {...props} style={{ paddingLeft: 24, margin: '8px 0', listStyleType: 'disc' }} />
        },
        ol(props) {
            return <ol {...props} style={{ paddingLeft: 24, margin: '8px 0', listStyleType: 'decimal' }} />
        },
        li(props) {
            return <li {...props} style={{ margin: '4px 0' }} />
        },
        h1(props) {
            return <h1 {...props} style={{ fontSize: '1.6em', fontWeight: 'bold', margin: '16px 0 8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: 4 }} />
        },
        h2(props) {
            return <h2 {...props} style={{ fontSize: '1.4em', fontWeight: 'bold', margin: '14px 0 8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: 4 }} />
        },
        h3(props) {
            return <h3 {...props} style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '12px 0 8px' }} />
        },
        p(props) {
            return <p {...props} style={{ margin: '8px 0', lineHeight: 1.6 }} />
        },
        table(props) {
            return <div style={{ overflowX: 'auto' }}><table {...props} style={{ borderCollapse: 'collapse', width: '100%', margin: '12px 0' }} /></div>
        },
        th(props) {
            return <th {...props} style={{ border: '1px solid var(--glass-border)', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', textAlign: 'left' }} />
        },
        td(props) {
            return <td {...props} style={{ border: '1px solid var(--glass-border)', padding: '8px 12px' }} />
        },
        blockquote(props) {
            return <blockquote {...props} style={{ borderLeft: '4px solid var(--accent-1)', paddingLeft: 16, color: 'var(--text-secondary)', margin: '12px 0', fontStyle: 'italic' }} />
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

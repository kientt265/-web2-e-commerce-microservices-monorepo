export function LogsPanel({ logs }: { logs: string[] }) {
  return (
    <div className="side-card">
      <div className="side-title">Logs</div>
      <div className="logs">
        {logs.length === 0 ? (
          <div className="muted small">Chưa có logs.</div>
        ) : (
          logs.map((l, idx) => (
            <div key={idx} className="log-line">
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


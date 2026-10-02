import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { jobs } from "./data/jobs";
import "./styles.css";

const navItems = [
  ["dashboard", "Overview"],
  ["jobs", "Jobs"],
  ["applications", "Applications"],
  ["simulations", "Simulations"],
  ["credentials", "Credentials"],
  ["verify", "Verify credential"],
];

function App() {
  const [active, setActive] = useState("dashboard");
  const [selectedJob, setSelectedJob] = useState(jobs[0]);
  const [query, setQuery] = useState("");
  const [applications, setApplications] = useState([]);
  const [simulationScores, setSimulationScores] = useState({});
  const [credentialId, setCredentialId] = useState("UC-2026-001");
  const [verification, setVerification] = useState(null);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) =>
      [job.title, job.company, job.location, ...job.requirements]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  const appliedIds = new Set(applications.map((item) => item.jobId));

  function openJob(job) {
    setSelectedJob(job);
    setActive("jobs");
  }

  function applyFor(job) {
    if (appliedIds.has(job.id)) return;
    setApplications((current) => [
      ...current,
      {
        jobId: job.id,
        status: "Submitted",
        submitted: "2 Oct 2026",
      },
    ]);
  }

  function completeSimulation(job) {
    const score = job.match < 50 ? 76 : job.match < 75 ? 82 : 88;
    setSimulationScores((current) => ({ ...current, [job.id]: score }));
    if (!appliedIds.has(job.id)) applyFor(job);
  }

  function verifyCredential() {
    setVerification({
      id: credentialId || "UC-2026-001",
      status: "Valid",
      qualification: "BSc Software Engineering",
      institution: "African Leadership University",
      issued: "15 Sep 2026",
      record: "0x82ad...93bf",
    });
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">UC</div>
          <div>
            <strong>UjuziChain</strong>
            <span>Candidate portal</span>
          </div>
        </div>

        <nav className="nav">
          {navItems.map(([key, label]) => (
            <button
              key={key}
              className={active === key ? "active" : ""}
              onClick={() => setActive(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="account">
          <div className="avatar">MO</div>
          <div>
            <strong>Demo Candidate</strong>
            <span>0x5FbD...0aa3</span>
          </div>
        </div>
      </aside>

      <div className="page">
        <header className="topbar">
          <div>
            <strong>{navItems.find(([key]) => key === active)?.[1]}</strong>
            <span>Initial software demonstration</span>
          </div>
          <button className="wallet-button">Wallet connected</button>
        </header>

        <main>
          {active === "dashboard" && (
            <Dashboard
              jobs={jobs}
              applications={applications}
              simulationScores={simulationScores}
              openJobs={() => setActive("jobs")}
              openJob={openJob}
            />
          )}

          {active === "jobs" && (
            <Jobs
              jobs={filteredJobs}
              selectedJob={selectedJob}
              query={query}
              setQuery={setQuery}
              openJob={setSelectedJob}
              applyFor={applyFor}
              appliedIds={appliedIds}
              simulationScores={simulationScores}
              startSimulation={() => setActive("simulations")}
            />
          )}

          {active === "applications" && (
            <Applications applications={applications} simulationScores={simulationScores} openJob={openJob} />
          )}

          {active === "simulations" && (
            <Simulations
              job={selectedJob}
              score={simulationScores[selectedJob.id]}
              complete={() => completeSimulation(selectedJob)}
            />
          )}

          {active === "credentials" && <Credentials />}

          {active === "verify" && (
            <Verify
              credentialId={credentialId}
              setCredentialId={setCredentialId}
              verification={verification}
              verify={verifyCredential}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function Dashboard({ jobs, applications, simulationScores, openJobs, openJob }) {
  const suggested = [...jobs].sort((a, b) => b.match - a.match).slice(0, 3);
  return (
    <>
      <section className="intro-row">
        <div>
          <h1>Welcome back</h1>
          <p>
            Browse every available role. Match scores help you understand fit, but do not prevent you from applying.
          </p>
        </div>
        <button className="primary" onClick={openJobs}>Browse jobs</button>
      </section>

      <section className="metric-grid">
        <Metric label="Available jobs" value={jobs.length} note="Visible to all candidates" />
        <Metric label="Applications" value={applications.length} note="This demo session" />
        <Metric label="Completed simulations" value={Object.keys(simulationScores).length} note="Practical assessments" />
        <Metric label="Verified credentials" value="1" note="Active on registry" />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Jobs for you</h2>
              <p>Sorted by profile match. Lower-match jobs remain available.</p>
            </div>
            <button className="text-button" onClick={openJobs}>View all</button>
          </div>
          <div className="compact-jobs">
            {suggested.map((job) => (
              <button key={job.id} onClick={() => openJob(job)}>
                <div>
                  <strong>{job.title}</strong>
                  <span>{job.company} · {job.location}</span>
                </div>
                <span className="match">{job.match}%</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel profile-panel">
          <div className="panel-heading"><div><h2>Profile</h2><p>Credential status</p></div></div>
          <div className="profile-line"><span>Academic credential</span><strong className="status-ok">Verified</strong></div>
          <div className="profile-line"><span>Wallet</span><strong>Connected</strong></div>
          <div className="profile-line"><span>Job access</span><strong>All listings</strong></div>
          <div className="profile-line"><span>Simulation results</span><strong>{Object.keys(simulationScores).length}</strong></div>
        </section>
      </div>

      <section className="panel sources">
        <div className="panel-heading">
          <div>
            <h2>Job sources</h2>
            <p>Prototype of the ingestion layer. External connections are represented with demo data in this phase.</p>
          </div>
        </div>
        <div className="source-table">
          <SourceRow name="Company submissions" method="Direct posting" status="Active" />
          <SourceRow name="Partner job feed" method="API / feed" status="Demo" />
          <SourceRow name="ATS connector" method="Scheduled sync" status="Planned" />
          <SourceRow name="Approved career pages" method="Permitted integration" status="Planned" />
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, note }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function SourceRow({ name, method, status }) {
  return <div><strong>{name}</strong><span>{method}</span><em className={`source-${status.toLowerCase()}`}>{status}</em></div>;
}

function Jobs({ jobs, selectedJob, query, setQuery, openJob, applyFor, appliedIds, simulationScores, startSimulation }) {
  const applied = appliedIds.has(selectedJob.id);
  const score = simulationScores[selectedJob.id];
  return (
    <section className="jobs-page">
      <div className="jobs-column panel">
        <div className="panel-heading jobs-heading">
          <div><h1>Jobs</h1><p>{jobs.length} role{jobs.length === 1 ? "" : "s"} available</p></div>
        </div>
        <input
          className="search"
          placeholder="Search title, company, location or skill"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="job-list">
          {jobs.map((job) => (
            <button key={job.id} className={selectedJob.id === job.id ? "selected" : ""} onClick={() => openJob(job)}>
              <div className="company-mark">{job.company.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
              <div className="job-copy">
                <strong>{job.title}</strong>
                <span>{job.company}</span>
                <small>{job.location} · {job.type}</small>
              </div>
              <span className="match">{job.match}%</span>
            </button>
          ))}
        </div>
      </div>

      <article className="job-detail panel">
        <div className="job-title-row">
          <div className="company-mark large">{selectedJob.company.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div>
          <div><h1>{selectedJob.title}</h1><p>{selectedJob.company} · {selectedJob.location}</p></div>
        </div>

        <div className="job-meta">
          <span>{selectedJob.type}</span><span>Source: {selectedJob.source}</span><span>Posted {selectedJob.posted}</span>
        </div>

        <div className="match-box">
          <div><span>Profile match</span><strong>{selectedJob.match}%</strong></div>
          <div className="progress"><span style={{ width: `${selectedJob.match}%` }} /></div>
          <p>You can apply even if your match score is low. A simulation can provide additional evidence.</p>
        </div>

        <h3>About the role</h3>
        <p className="body-copy">{selectedJob.description}</p>
        <h3>Key requirements</h3>
        <ul className="requirements">{selectedJob.requirements.map((item) => <li key={item}>{item}</li>)}</ul>

        <div className="action-row">
          <button className="primary" disabled={applied} onClick={() => applyFor(selectedJob)}>{applied ? "Application submitted" : "Apply"}</button>
          <button className="secondary" onClick={startSimulation}>{score ? `Simulation: ${score}%` : "Take simulation"}</button>
        </div>
      </article>
    </section>
  );
}

function Applications({ applications, simulationScores, openJob }) {
  return (
    <section className="panel">
      <div className="panel-heading"><div><h1>Applications</h1><p>Applications submitted during this demo session.</p></div></div>
      {applications.length === 0 ? (
        <div className="empty"><strong>No applications yet</strong><span>Open Jobs and submit an application to see it here.</span></div>
      ) : (
        <div className="application-table">
          <div className="table-head"><span>Role</span><span>Submitted</span><span>Simulation</span><span>Status</span></div>
          {applications.map((app) => {
            const job = jobs.find((item) => item.id === app.jobId);
            return <button key={app.jobId} onClick={() => openJob(job)}>
              <span><strong>{job.title}</strong><small>{job.company}</small></span>
              <span>{app.submitted}</span>
              <span>{simulationScores[job.id] ? `${simulationScores[job.id]}%` : "Not taken"}</span>
              <span className="status-pill">{app.status}</span>
            </button>;
          })}
        </div>
      )}
    </section>
  );
}

function Simulations({ job, score, complete }) {
  return (
    <section className="panel simulation-page">
      <div className="panel-heading">
        <div><h1>Job simulation</h1><p>{job.title} · {job.company}</p></div>
        <span className="demo-label">Demo assessment</span>
      </div>
      <p className="body-copy">
        This role-specific exercise is an additional way to demonstrate practical ability. It does not replace verified credentials; employers can review both forms of evidence.
      </p>
      <div className="assessment">
        <div><span>01</span><div><strong>Review the scenario</strong><p>Read a short workplace problem related to the role.</p></div><em>10 min</em></div>
        <div><span>02</span><div><strong>Complete the practical task</strong><p>Submit a solution or response based on the job requirements.</p></div><em>25 min</em></div>
        <div><span>03</span><div><strong>Explain your approach</strong><p>Describe trade-offs, assumptions and the steps you took.</p></div><em>10 min</em></div>
      </div>
      {score ? (
        <div className="score-card"><span>Simulation score</span><strong>{score}%</strong><p>Result attached to the application as additional evidence.</p></div>
      ) : (
        <button className="primary" onClick={complete}>Complete demo simulation</button>
      )}
    </section>
  );
}

function Credentials() {
  return (
    <section className="panel">
      <div className="panel-heading"><div><h1>Credentials</h1><p>Verified records linked to this profile.</p></div></div>
      <div className="credential-row">
        <div className="credential-icon">✓</div>
        <div><strong>BSc Software Engineering</strong><span>African Leadership University</span><small>Credential ID UC-2026-001 · Issued 15 Sep 2026</small></div>
        <span className="status-ok">Verified</span>
      </div>
      <div className="info-note">Credential verification contributes to trust and job matching. It does not restrict access to job listings or applications.</div>
    </section>
  );
}

function Verify({ credentialId, setCredentialId, verification, verify }) {
  return (
    <section className="panel verify-page">
      <div className="panel-heading"><div><h1>Verify credential</h1><p>Check the status of a credential recorded by the UjuziChain contract.</p></div></div>
      <label htmlFor="credential">Credential ID</label>
      <div className="verify-form">
        <input id="credential" value={credentialId} onChange={(e) => setCredentialId(e.target.value)} />
        <button className="primary" onClick={verify}>Verify</button>
      </div>
      {verification && (
        <div className="verification-result">
          <div className="credential-icon">✓</div>
          <div className="verification-copy">
            <div><strong>{verification.qualification}</strong><span className="status-ok">{verification.status}</span></div>
            <p>{verification.institution}</p>
            <dl>
              <div><dt>Credential ID</dt><dd>{verification.id}</dd></div>
              <div><dt>Issued</dt><dd>{verification.issued}</dd></div>
              <div><dt>Blockchain record</dt><dd>{verification.record}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

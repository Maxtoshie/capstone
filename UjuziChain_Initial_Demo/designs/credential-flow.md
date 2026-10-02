# UjuziChain Credential, Job Discovery and Simulation Flow

The updated workflow removes credential verification as a gate to viewing jobs. Verification strengthens the candidate profile and match score, while opportunity discovery remains open to all registered candidates.

```mermaid
flowchart TD
    A[Student creates account] --> B[Upload documents, qualifications and skills]
    B --> C[Institution verifies documents]
    C --> D[Blockchain registry records credential hash, issuer and validity]
    D --> E[Verified profile]

    F[External job sources / approved APIs / partner feeds] --> G[Automatic job ingestion]
    H[Company posts job directly] --> I[Job listings]
    G --> I

    A --> I
    I --> J[Candidate browses all jobs]
    E --> K[Matching engine]
    I --> K
    K --> J
    K --> L[0–100% match score + reason]

    J --> M[Apply for any job]
    L --> M
    M --> N{Profile strongly matches?}
    N -- Yes --> O[Application + verified evidence sent to employer]
    N -- No / candidate chooses --> P[Role-specific job simulation]
    P --> Q[Simulation score + practical evidence]
    Q --> O
    O --> R[Employer review / shortlist / outcome]
```

## Key change from the earlier design

Previously, the workflow implied that verified profiles were required before job-listing access. In this version:

1. A registered candidate can view **all job listings**.
2. A candidate can apply even when the match score is low.
3. The platform can recommend a **job simulation** similar in purpose to virtual work-experience assessments: practical tasks produce additional evidence for the application.
4. Job listings can be synchronized from external sources through permitted integrations, in addition to jobs posted directly by companies.
5. Verified blockchain credentials remain valuable for trust and matching, but they are not used as a barrier to opportunity.

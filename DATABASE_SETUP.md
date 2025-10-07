# Database Setup Instructions

## Overview
This GRC system is designed to work with your existing SQL Server database. The system is currently using mock data and needs to be connected to your actual database.

## Database Connection Setup

### 1. Install Database Dependencies
```bash
npm install mssql
npm install @types/mssql --save-dev
```

### 2. Update Database Service
Replace the `DatabaseService` in `src/database/database.service.ts` with your actual database connection:

```typescript
import { Injectable } from '@nestjs/common';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService {
  private pool: sql.ConnectionPool;

  constructor() {
    this.initializeConnection();
  }

  private async initializeConnection() {
    const config = {
      server: 'your-server-name',
      database: 'your-database-name',
      user: 'your-username',
      password: 'your-password',
      options: {
        encrypt: true, // Use this if you're on Windows Azure
        trustServerCertificate: true // Use this if you're on Windows Azure
      }
    };

    this.pool = new sql.ConnectionPool(config);
    await this.pool.connect();
  }

  async query(sqlQuery: string, params: any[] = []) {
    const request = this.pool.request();
    
    // Add parameters if any
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });

    const result = await request.query(sqlQuery);
    return result.recordset;
  }

  async getConnection() {
    return this.pool;
  }

  async closeConnection() {
    if (this.pool) {
      await this.pool.close();
    }
  }
}
```

### 3. Update GRC Service Queries
Replace the mock data in `src/grc/grc.service.ts` with actual SQL queries:

#### Controls Queries
```typescript
async getControlsData(timeframe: string) {
  const totalControlsQuery = `
    SELECT COUNT(*) as totalControls
    FROM dbo.[Controls]
    WHERE isDeleted = 0
  `;

  const unmappedControlsQuery = `
    SELECT COUNT(*) AS unmappedControls
    FROM GRCDB2.dbo.Controls AS c
    WHERE c.isDeleted = 0
      AND NOT EXISTS (
        SELECT 1 FROM GRCDB2.dbo.ControlCosos AS ccx
        WHERE ccx.control_id = c.id AND ccx.deletedAt IS NULL
      )
  `;

  const controlsByDepartmentQuery = `
    SELECT 
        f.name AS department_name,
        COUNT(c.id) AS controls_count
    FROM GRCDB2.dbo.Controls c
    JOIN GRCDB2.dbo.ControlFunctions cf 
        ON c.id = cf.control_id
    JOIN GRCDB2.dbo.Functions f 
        ON cf.function_id = f.id
    WHERE c.isDeleted = 0
    GROUP BY f.name
  `;

  // Execute queries and return results
  const totalControls = await this.databaseService.query(totalControlsQuery);
  const unmappedControls = await this.databaseService.query(unmappedControlsQuery);
  const controlsByDepartment = await this.databaseService.query(controlsByDepartmentQuery);

  return {
    totalControls: totalControls[0].totalControls,
    unmappedControls: unmappedControls[0].unmappedControls,
    controlsByDepartment: controlsByDepartment,
    // ... other data
  };
}
```

#### Incidents Queries
```typescript
async getIncidentsData(timeframe: string) {
  const totalIncidentsQuery = `
    SELECT COUNT(*) as totalIncidents
    FROM dbo.[Incidents]
    WHERE isDeleted = 0
  `;

  const incidentsByCategoryQuery = `
    SELECT
        i.id AS incident_id,
        i.createdAt AS created_at,
        c.name AS category_name
    FROM dbo.Incidents i
    JOIN dbo.Categories c
        ON i.category_id = c.id
    WHERE i.deletedAt IS NULL
  `;

  // Execute queries and return results
  const totalIncidents = await this.databaseService.query(totalIncidentsQuery);
  const incidentsByCategory = await this.databaseService.query(incidentsByCategoryQuery);

  return {
    totalIncidents: totalIncidents[0].totalIncidents,
    incidentsByCategory: incidentsByCategory,
    // ... other data
  };
}
```

#### KRIs Queries
```typescript
async getKRIsData(timeframe: string) {
  const totalKRIsQuery = `
    SELECT COUNT(*) as totalKRIs
    FROM dbo.Kris
    WHERE isDeleted = 0
  `;

  const breachedKRIsQuery = `
    SELECT
        k.id AS kri_id,
        f.name AS function_name,
        CASE
            WHEN k.isAscending = 1 AND kv.value > k.high_from THEN 1
            WHEN k.isAscending = 0 AND kv.value < k.high_from THEN 1
            ELSE 0
        END AS isBreached
    FROM [NEWDCC-V4-UAT].dbo.Kris k
    JOIN [NEWDCC-V4-UAT].dbo.KriValues kv 
        ON k.id = kv.kriId
       AND kv.[year] = YEAR(GETDATE())
       AND kv.[month] = MONTH(GETDATE())
    JOIN [NEWDCC-V4-UAT].dbo.Functions f
        ON k.related_function_id = f.id
    WHERE k.isDeleted = 0
  `;

  // Execute queries and return results
  const totalKRIs = await this.databaseService.query(totalKRIsQuery);
  const breachedKRIs = await this.databaseService.query(breachedKRIsQuery);

  return {
    totalKRIs: totalKRIs[0].totalKRIs,
    breachedKRIs: breachedKRIs.filter(k => k.isBreached === 1).length,
    // ... other data
  };
}
```

#### Risks Queries
```typescript
async getRisksData(timeframe: string) {
  const totalRisksQuery = `
    SELECT COUNT(*) as totalRisks
    FROM dbo.[Risks]
    WHERE isDeleted = 0
  `;

  const risksByCategoryQuery = `
    SELECT
      c.name AS category,
      r.id AS risk_id
    FROM [NEWDCC-V4-UAT].dbo.Risks r
    JOIN [NEWDCC-V4-UAT].dbo.RiskCategories rc
      ON rc.risk_id = r.id
    JOIN [NEWDCC-V4-UAT].dbo.Categories c
      ON c.id = rc.category_id
    WHERE r.isDeleted = 0
  `;

  const inherentVsResidualQuery = `
    SELECT
        r.id AS risk_id,
        r.name AS risk_name,
        r.inherent_value AS inherent_value,
        rr.residual_value AS residual_value,
        r.createdAt AS created_at
    FROM [NEWDCC-V4-UAT].dbo.Risks r
    JOIN [NEWDCC-V4-UAT].dbo.ResidualRisks rr
        ON rr.riskId = r.id
    WHERE r.isDeleted = 0
  `;

  // Execute queries and return results
  const totalRisks = await this.databaseService.query(totalRisksQuery);
  const risksByCategory = await this.databaseService.query(risksByCategoryQuery);
  const inherentVsResidual = await this.databaseService.query(inherentVsResidualQuery);

  return {
    totalRisks: totalRisks[0].totalRisks,
    risksByCategory: risksByCategory,
    inherentVsResidual: inherentVsResidual,
    // ... other data
  };
}
```

## Environment Variables
Create a `.env` file in the backend-node directory:

```env
DB_SERVER=your-server-name
DB_DATABASE=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
```

## Testing
After setting up the database connection, test the endpoints:

- `GET http://localhost:3002/api/grc/controls`
- `GET http://localhost:3002/api/grc/incidents`
- `GET http://localhost:3002/api/grc/kris`
- `GET http://localhost:3002/api/grc/risks`

## Notes
- All SQL queries are based on your provided GRC database schema
- The system supports timeframe filtering (7d, 30d, 90d, 1y)
- Mock data is currently being used until database connection is established
- Reports (PDF/Excel) are handled by the Python backend

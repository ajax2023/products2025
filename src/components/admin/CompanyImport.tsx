import React, { useState } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Papa from 'papaparse';
import { Company } from '../../types/company';

interface CompanyImportProps {
  onClose?: () => void;
}

export default function CompanyImport({ onClose }: CompanyImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const downloadTemplate = () => {
    const header = 'name,country,state,city,employee_count,industry,website,founded_year,description,brands\n';
    const sampleData = [
      'Tech Corp,United States,California,San Francisco,1000,Technology,https://techcorp.com,1995,"Leading tech company","[""TechOS"",""TechCloud"",""TechMobile""]"',
      'Global Foods,Canada,Ontario,Toronto,500,Food & Beverage,https://globalfoods.com,1980,"Premium food producer","[""Fresh Farms"",""Organic Life""]"',
      'Health Plus,United States,New York,New York,750,Healthcare,https://healthplus.com,2000,"Healthcare solutions","[""HealthCare"",""MediPlus""]"'
    ].join('\n');

    const blob = new Blob([header + sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'company_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          const companiesRef = collection(db, 'companies');

          console.log('Parsed CSV data:', results.data);

          let index = 0;
          for (const row of results.data) {
            try {
              if (!row.name || !row.country || !row.city || !row.employee_count) {
                console.error('Missing required fields:', row);
                continue;
              }

              const docRef = doc(companiesRef);
              let brands: string[] = [];
              
              try {
                if (row.brands) {
                  // Remove any extra quotes around the JSON string
                  const cleanJson = row.brands.replace(/^["']|["']$/g, '');
                  brands = JSON.parse(cleanJson);
                }
              } catch (jsonError) {
                console.error('Error parsing brands JSON:', row.brands, jsonError);
                setError('Error parsing brands JSON. Make sure it is a valid JSON array.');
                return;
              }

              const now = new Date();
              const company: Partial<Company> = {
                name: row.name,
                headquarters: {
                  country: row.country,
                  state: row.state || '',
                  city: row.city
                },
                employee_count: parseInt(row.employee_count),
                brands,
                industry: row.industry || undefined,
                website: row.website || undefined,
                founded_year: row.founded_year ? parseInt(row.founded_year) : undefined,
                description: row.description || undefined,
                created_at: now,
                created_by: auth.currentUser?.uid || '',
                updated_at: now,
                updated_by: auth.currentUser?.uid || ''
              };

              console.log('Adding company:', company);
              batch.set(docRef, company);
              index++;
            } catch (rowError) {
              console.error('Error processing row:', row, rowError);
            }
          }

          console.log('Committing batch...');
          await batch.commit();
          console.log('Batch committed successfully');
          setSuccess(`Successfully imported ${index} companies`);
          
          // Close after a short delay to show success message
          setTimeout(() => {
            if (onClose) onClose();
            // Force reload the page to refresh the company list
            window.location.reload();
          }, 1500);
        } catch (err) {
          console.error('Import error:', err);
          setError('Error importing companies: ' + (err as Error).message);
        }
      },
      error: (err) => {
        console.error('CSV parsing error:', err);
        setError('Error parsing CSV file: ' + err.message);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" gutterBottom>
          Import companies using a CSV file with the following columns:
        </Typography>
        <Typography component="ul" sx={{ pl: 2 }}>
          <li><strong>name</strong> (required): Company name</li>
          <li><strong>country</strong> (required): Headquarters country</li>
          <li><strong>state</strong> (optional): Headquarters state/province</li>
          <li><strong>city</strong> (required): Headquarters city</li>
          <li><strong>employee_count</strong> (required): Number of employees</li>
          <li><strong>industry</strong> (optional): Company industry</li>
          <li><strong>website</strong> (optional): Company website URL</li>
          <li><strong>founded_year</strong> (optional): Year company was founded</li>
          <li><strong>description</strong> (optional): Company description</li>
          <li><strong>brands</strong> (optional): JSON array of brand names (e.g., ["Brand1", "Brand2"])</li>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Note: Brands must be a valid JSON array of strings. The system will automatically add creation date and user information.
        </Typography>
      </Box>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="outlined" onClick={downloadTemplate}>
          Download Template
        </Button>
        <input
          accept=".csv"
          style={{ display: 'none' }}
          id="import-button"
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="import-button">
          <Button variant="contained" component="span">
            Upload CSV
          </Button>
        </label>
      </div>
    </div>
  );
}

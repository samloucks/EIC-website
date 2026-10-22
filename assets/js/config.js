/* ==========================================================================
   Member directory configuration.

   Both Supabase values below are PUBLIC and are meant to ship in client-side
   code. The anon key is not a secret: it only ever grants what the row-level
   security policies in supabase/schema.sql allow. The key that *is* secret —
   the service_role key — must never appear in this repository.

   Fill in the two values from Supabase → Project Settings → API.
   ========================================================================== */

window.EIC_CONFIG = {
  supabaseUrl:     'https://ssuhicrldtqztlrlwcnf.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdWhpY3JsZHRxenRscmx3Y25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTc3MjUsImV4cCI6MjEwODI3MzcyNX0.ScnYZF3VgwI4Ihu8NQIopyaB_reObwl-0kSsIsxPgP0',
};


/* --- Vocabulary -----------------------------------------------------------
   These drive the profile form. The directory's filter menus are built from
   whatever the members actually chose, so adding an option here is enough —
   nothing else needs changing. Editing an existing label does not rewrite the
   profiles already saved with the old spelling. */

window.EIC_VOCAB = {

  /* Analyst through Principal is the stated range of the community, plus the
     non-investing roles listed on the home page. */
  roles: [
    'Analyst',
    'Associate',
    'Senior Associate',
    'Principal',
    'Investment Manager',
    'Platform / Community',
    'Venture Partner',
    'Venture Scout',
    'Operations / Finance',
    'Entrepreneur in Residence',
    'Other',
  ],

  /* Canada first — it is where almost everyone will be — then alphabetical. */
  countries: [
    'Canada',
    'United States',
    'Australia',
    'Brazil',
    'France',
    'Germany',
    'India',
    'Ireland',
    'Israel',
    'Japan',
    'Mexico',
    'Netherlands',
    'Singapore',
    'Sweden',
    'Switzerland',
    'United Arab Emirates',
    'United Kingdom',
    'Other',
  ],

  interests: [
    'AI & machine learning',
    'Fintech',
    'Healthcare & biotech',
    'Enterprise software',
    'Consumer',
    'Marketplaces',
    'Climate & energy',
    'Deep tech',
    'Hardware & robotics',
    'Developer tools',
    'Cybersecurity',
    'Space & defence',
    'Agtech & food',
    'Gaming & media',
    'Web3 & crypto',
    'Supply chain & logistics',
    'Education',
    'Impact investing',
  ],
};

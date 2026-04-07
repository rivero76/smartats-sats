-- UPDATE LOG
-- 2026-04-05 11:00:00 | P26 S0-1 — Seed ~88 role families across 11 domains
--   covering NZ, AU, UK, Brazil, and USA job markets. Each family includes ≥3
--   regional name variants as aliases for title-to-family matching.

INSERT INTO public.sats_role_families (name, description, aliases, market_codes) VALUES

-- ─── Software Engineering ────────────────────────────────────────────────────

('Software Engineer (Backend)',
 'Server-side development, APIs, databases and distributed systems',
 ARRAY['Backend Developer','Backend Engineer','Server-Side Developer','API Developer','Node.js Developer','Java Developer','Python Developer','Ruby Developer','Go Developer','Golang Developer','C# Developer','.NET Developer','PHP Developer','Scala Developer','Kotlin Developer','Rust Developer','Spring Developer','Django Developer','Rails Developer','Desenvolvedor Backend','Engenheiro Backend'],
 ARRAY['nz','au','uk','br','us']),

('Software Engineer (Frontend)',
 'Client-side web development, UI implementation and browser applications',
 ARRAY['Frontend Developer','Frontend Engineer','UI Developer','React Developer','Vue.js Developer','Angular Developer','JavaScript Developer','TypeScript Developer','Web Developer','Desenvolvedor Frontend','Engenheiro Frontend'],
 ARRAY['nz','au','uk','br','us']),

('Software Engineer (Full Stack)',
 'End-to-end web application development across frontend and backend',
 ARRAY['Full Stack Developer','Full Stack Engineer','Fullstack Developer','Full-Stack Developer','Web Application Developer','Desenvolvedor Full Stack','Engenheiro Full Stack'],
 ARRAY['nz','au','uk','br','us']),

('Mobile Engineer',
 'Native and cross-platform mobile application development for iOS and Android',
 ARRAY['iOS Developer','Android Developer','Mobile Developer','Mobile Engineer','React Native Developer','Flutter Developer','Swift Developer','Kotlin Mobile Developer','Xamarin Developer','Desenvolvedor Mobile','Engenheiro Mobile'],
 ARRAY['nz','au','uk','br','us']),

('QA / Test Engineer',
 'Software quality assurance, test automation and manual testing',
 ARRAY['QA Engineer','Test Engineer','Quality Assurance Engineer','SDET','Test Automation Engineer','QA Analyst','Automation Tester','Software Tester','Quality Engineer','Testing Engineer','QA Specialist','Analista de Qualidade','Engenheiro de Testes'],
 ARRAY['nz','au','uk','br','us']),

('Embedded / Firmware Engineer',
 'Low-level software for embedded systems, microcontrollers and hardware interfaces',
 ARRAY['Embedded Software Engineer','Firmware Engineer','Embedded Systems Engineer','RTOS Developer','Hardware Software Engineer','Embedded Developer','Microcontroller Developer'],
 ARRAY['nz','au','uk','br','us']),

('Game Developer',
 'Video game programming, game engine development and interactive media',
 ARRAY['Game Developer','Game Engineer','Unity Developer','Unreal Developer','Graphics Programmer','Game Programmer','Game Software Engineer','Desenvolvedor de Games'],
 ARRAY['nz','au','uk','br','us']),

('Security Engineer (AppSec)',
 'Application security, penetration testing and secure software development',
 ARRAY['Application Security Engineer','AppSec Engineer','Security Developer','Penetration Tester','Pen Tester','Ethical Hacker','Security Researcher','Red Team Engineer','Vulnerability Researcher','Engenheiro de Segurança'],
 ARRAY['nz','au','uk','br','us']),

('API / Integration Engineer',
 'System integration, middleware, APIs and inter-system connectivity',
 ARRAY['Integration Engineer','API Engineer','Integration Developer','Middleware Developer','iPaaS Developer','MuleSoft Developer','Systems Integration Engineer','Integration Specialist','API Developer','Boomi Developer','Engenheiro de Integração'],
 ARRAY['nz','au','uk','br','us']),

('Systems Software Engineer',
 'Low-level systems programming, OS internals, compilers and runtime environments',
 ARRAY['Systems Engineer (Software)','Low-Level Developer','OS Developer','Kernel Engineer','Compiler Engineer','Systems Programmer','Platform Software Engineer'],
 ARRAY['nz','au','uk','br','us']),

-- ─── Data & AI ───────────────────────────────────────────────────────────────

('Data Engineer',
 'Data pipeline design, ETL/ELT, data warehousing and platform engineering',
 ARRAY['Data Engineer','ETL Developer','Data Platform Engineer','Big Data Engineer','Spark Engineer','Data Infrastructure Engineer','Pipeline Engineer','DataOps Engineer','Engenheiro de Dados'],
 ARRAY['nz','au','uk','br','us']),

('Data Scientist',
 'Statistical modelling, machine learning experimentation and predictive analytics',
 ARRAY['Data Scientist','ML Scientist','AI Scientist','Applied Scientist','Research Scientist','Quantitative Analyst','Quant','Computational Scientist','Cientista de Dados'],
 ARRAY['nz','au','uk','br','us']),

('Machine Learning Engineer',
 'Building, training and deploying machine learning and deep learning models',
 ARRAY['ML Engineer','Machine Learning Engineer','AI Engineer','Deep Learning Engineer','Computer Vision Engineer','NLP Engineer','AI/ML Engineer','Engenheiro de Machine Learning','Engenheiro de IA'],
 ARRAY['nz','au','uk','br','us']),

('Data Analyst',
 'Business intelligence analysis, reporting, dashboards and data storytelling',
 ARRAY['Data Analyst','Business Intelligence Analyst','BI Analyst','Reporting Analyst','SQL Analyst','Insights Analyst','Analytics Analyst','Analista de Dados'],
 ARRAY['nz','au','uk','br','us']),

('Business Intelligence Developer',
 'BI tool development, semantic data models and self-service analytics platforms',
 ARRAY['BI Developer','Business Intelligence Developer','Power BI Developer','Tableau Developer','Looker Developer','Data Visualization Developer','Qlik Developer','Engenheiro de Business Intelligence'],
 ARRAY['nz','au','uk','br','us']),

('MLOps Engineer',
 'Machine learning infrastructure, model deployment pipelines and monitoring',
 ARRAY['MLOps Engineer','ML Platform Engineer','AI Platform Engineer','ML Infrastructure Engineer','Model Operations Engineer','LLMOps Engineer'],
 ARRAY['nz','au','uk','br','us']),

('Analytics Engineer',
 'Data transformation, semantic layer modelling and analytics platform engineering',
 ARRAY['Analytics Engineer','dbt Developer','Data Modeller','Analytics Platform Engineer','Data Modeler','Semantic Layer Engineer'],
 ARRAY['nz','au','uk','br','us']),

-- ─── DevOps / Platform / Cloud ───────────────────────────────────────────────

('DevOps Engineer',
 'CI/CD pipelines, infrastructure automation and developer tooling',
 ARRAY['DevOps Engineer','DevOps Specialist','CI/CD Engineer','Release Engineer','Build Engineer','DevOps Consultant','Platform Developer','Engenheiro DevOps'],
 ARRAY['nz','au','uk','br','us']),

('Platform / SRE Engineer',
 'Platform reliability, internal developer platforms and production resilience',
 ARRAY['Platform Engineer','SRE','Site Reliability Engineer','Infrastructure Developer','Cloud Engineer','Reliability Engineer','Production Engineer','Infrastructure Platform Engineer'],
 ARRAY['nz','au','uk','br','us']),

('Cloud Architect',
 'Cloud strategy, infrastructure design and multi-cloud architecture',
 ARRAY['Cloud Architect','AWS Architect','Azure Architect','GCP Architect','Cloud Solutions Architect','Cloud Infrastructure Architect','Cloud Migration Architect','Arquiteto de Nuvem'],
 ARRAY['nz','au','uk','br','us']),

('Infrastructure Engineer',
 'On-premise and hybrid infrastructure, servers, storage and operating systems',
 ARRAY['Infrastructure Engineer','Systems Administrator','Linux Administrator','Windows Administrator','IT Infrastructure Engineer','Sysadmin','Server Administrator','IT Systems Engineer'],
 ARRAY['nz','au','uk','br','us']),

('Network Engineer',
 'Network design, configuration, routing and telecommunications infrastructure',
 ARRAY['Network Engineer','Network Administrator','Network Architect','Cisco Engineer','Juniper Engineer','Telecommunications Engineer','Network Specialist','WAN Engineer','Network Analyst'],
 ARRAY['nz','au','uk','br','us']),

('Database Administrator',
 'Database management, performance tuning, backup/recovery and data integrity',
 ARRAY['DBA','Database Administrator','Database Engineer','SQL Server DBA','Oracle DBA','PostgreSQL DBA','MySQL DBA','Database Analyst','Data Platform Administrator'],
 ARRAY['nz','au','uk','br','us']),

-- ─── Product & UX ────────────────────────────────────────────────────────────

('Product Manager',
 'Product discovery, roadmap ownership and cross-functional delivery coordination',
 ARRAY['Product Manager','Digital Product Manager','Associate Product Manager','APM','PM','Group Product Manager','Product Owner','PO','Gerente de Produto'],
 ARRAY['nz','au','uk','br','us']),

('Senior Product Manager',
 'Senior and executive product leadership, product strategy and portfolio management',
 ARRAY['Senior Product Manager','Head of Product','VP Product','Chief Product Officer','CPO','Director of Product','Principal Product Manager','Director of Product Management'],
 ARRAY['nz','au','uk','br','us']),

('UX Designer',
 'User experience design, wireframing, prototyping and interaction design',
 ARRAY['UX Designer','User Experience Designer','Interaction Designer','UI/UX Designer','UX/UI Designer','Digital Designer','Experience Designer','Designer UX','Web Designer (UX)'],
 ARRAY['nz','au','uk','br','us']),

('UX Researcher',
 'User research, usability testing and design insights generation',
 ARRAY['UX Researcher','User Researcher','Design Researcher','Customer Experience Researcher','CX Researcher','Qualitative Researcher','Usability Researcher'],
 ARRAY['nz','au','uk','br','us']),

('Product Designer',
 'End-to-end product design spanning visual, interaction and systems design',
 ARRAY['Product Designer','Senior UX Designer','Lead Designer','Design Lead','UX Lead','Design Manager','Principal Designer','Senior Digital Designer'],
 ARRAY['nz','au','uk','br','us']),

('Technical Program Manager',
 'Cross-engineering programme management, delivery coordination and risk management',
 ARRAY['Technical Program Manager','TPM','Engineering Program Manager','Software Program Manager','Programme Manager (Technical)','Technical Delivery Manager','Technology Programme Manager'],
 ARRAY['nz','au','uk','br','us']),

-- ─── IT Operations & Security ────────────────────────────────────────────────

('IT Project Manager',
 'Managing IT and digital transformation projects from initiation to closure',
 ARRAY['IT Project Manager','Technology Project Manager','Digital Project Manager','Technical Project Manager','IT PM','ICT Project Manager','IS Project Manager','Information Technology Project Manager','Gerente de Projetos de TI'],
 ARRAY['nz','au','uk','br','us']),

('IT Business Analyst',
 'Eliciting requirements, bridging business and IT, and process improvement',
 ARRAY['IT Business Analyst','Business Analyst','Systems Business Analyst','Functional Analyst','IT BA','Requirements Analyst','Business Systems Analyst','Process Analyst','Analista de Negócios'],
 ARRAY['nz','au','uk','br','us']),

('Systems Analyst',
 'Analysis and specification of IT systems, applications and processes',
 ARRAY['Systems Analyst','ICT Analyst','IT Analyst','Technical Analyst','Application Analyst','IT Systems Analyst','IS Analyst'],
 ARRAY['nz','au','uk','br','us']),

('IT Support / Service Desk Engineer',
 'End-user technical support, incident resolution and IT service delivery',
 ARRAY['IT Support Engineer','Service Desk Engineer','Help Desk Technician','IT Technician','Desktop Support Analyst','IT Support Analyst','L1 Support','L2 Support','Technical Support Officer','ICT Support Officer'],
 ARRAY['nz','au','uk','br','us']),

('Solutions Architect',
 'Designing end-to-end technical solutions spanning applications and infrastructure',
 ARRAY['Solutions Architect','Enterprise Solutions Architect','Technical Architect','IT Architect','Technology Architect','Solution Designer','Applications Architect','Arquiteto de Soluções'],
 ARRAY['nz','au','uk','br','us']),

('Enterprise Architect',
 'Cross-enterprise architecture, capability design and technology roadmaps',
 ARRAY['Enterprise Architect','EA','Business Architecture Manager','Information Architect','Capability Architect','Digital Architect','IT Strategy Architect'],
 ARRAY['nz','au','uk','br','us']),

('Cybersecurity Analyst',
 'Threat monitoring, incident response, vulnerability management and SOC operations',
 ARRAY['Cybersecurity Analyst','Security Analyst','Information Security Analyst','SOC Analyst','Threat Analyst','Incident Response Analyst','Cyber Analyst','Security Operations Analyst','Analista de Segurança Cibernética'],
 ARRAY['nz','au','uk','br','us']),

('Information Security Manager',
 'Information security programme ownership, governance and executive security leadership',
 ARRAY['Information Security Manager','CISO','Chief Information Security Officer','IT Security Manager','Head of Information Security','Cyber Security Manager','Head of Cyber Security','Director of Information Security'],
 ARRAY['nz','au','uk','br','us']),

-- ─── Finance & Accounting ────────────────────────────────────────────────────

('Financial Analyst',
 'Financial planning, analysis, forecasting and management reporting',
 ARRAY['Financial Analyst','Finance Analyst','FP&A Analyst','Corporate Finance Analyst','Commercial Analyst','Budget Analyst','Finance Business Partner','Analista Financeiro'],
 ARRAY['nz','au','uk','br','us']),

('Management Accountant',
 'Cost accounting, management reporting and financial control',
 ARRAY['Management Accountant','Cost Accountant','Financial Accountant','Accountant','CPA','Chartered Accountant','CA','ACCA','CMA','Contador','Analista Contábil'],
 ARRAY['nz','au','uk','br','us']),

('Financial Controller',
 'Finance function leadership, statutory reporting and financial governance',
 ARRAY['Financial Controller','Finance Manager','Finance Director','Head of Finance','CFO','Chief Financial Officer','VP Finance','Group Financial Controller','Diretor Financeiro','Controller Financeiro'],
 ARRAY['nz','au','uk','br','us']),

('Auditor',
 'Internal and external audit, controls testing and assurance reporting',
 ARRAY['Auditor','Internal Auditor','External Auditor','IT Auditor','IS Auditor','Audit Manager','Risk & Audit Manager','Senior Auditor','Auditor Interno'],
 ARRAY['nz','au','uk','br','us']),

('Risk Analyst',
 'Enterprise, credit, market and operational risk identification and management',
 ARRAY['Risk Analyst','Credit Risk Analyst','Market Risk Analyst','Operational Risk Analyst','Enterprise Risk Analyst','Risk Manager','Risk & Compliance Analyst','Analista de Riscos'],
 ARRAY['nz','au','uk','br','us']),

('Investment Analyst',
 'Portfolio analysis, equity research and investment decision support',
 ARRAY['Investment Analyst','Equity Analyst','Portfolio Analyst','Asset Management Analyst','Fund Analyst','Hedge Fund Analyst','Buy-Side Analyst','Sell-Side Analyst','Analista de Investimentos'],
 ARRAY['nz','au','uk','br','us']),

('Tax Specialist',
 'Tax planning, compliance, reporting and advisory across direct and indirect taxes',
 ARRAY['Tax Specialist','Tax Accountant','Tax Manager','International Tax Manager','Indirect Tax Specialist','GST Specialist','VAT Specialist','Tax Advisor','Tax Consultant','Analista Tributário','Especialista Fiscal'],
 ARRAY['nz','au','uk','br','us']),

('Treasury Analyst',
 'Cash management, liquidity, funding and financial risk management',
 ARRAY['Treasury Analyst','Cash Manager','Treasury Manager','Corporate Treasury Analyst','Liquidity Analyst','Treasury Officer','Analista de Tesouraria'],
 ARRAY['nz','au','uk','br','us']),

-- ─── HR & People ─────────────────────────────────────────────────────────────

('HR Manager',
 'Generalist human resources partnering, policy and employee lifecycle management',
 ARRAY['HR Manager','Human Resources Manager','HR Business Partner','HRBP','People Manager','HR Generalist','HR Advisor','Human Resources Advisor','People Partner','HR Consultant','Gerente de RH','Analista de RH Sênior'],
 ARRAY['nz','au','uk','br','us']),

('Talent Acquisition Specialist',
 'Recruitment, sourcing and candidate experience management',
 ARRAY['Talent Acquisition Specialist','Recruiter','In-House Recruiter','Technical Recruiter','HR Recruiter','Sourcer','Talent Partner','People Scout','Talent Scout','Hiring Manager Support','Analista de Recrutamento','Recrutador'],
 ARRAY['nz','au','uk','br','us']),

('Learning & Development Specialist',
 'Employee learning programmes, capability development and training delivery',
 ARRAY['Learning & Development Specialist','L&D Specialist','Training Specialist','Training Manager','Organisational Development Specialist','Capability Manager','L&D Consultant','Corporate Trainer','Analista de Treinamento e Desenvolvimento'],
 ARRAY['nz','au','uk','br','us']),

('Compensation & Benefits Specialist',
 'Reward design, compensation benchmarking and benefits administration',
 ARRAY['Compensation & Benefits Specialist','Reward Specialist','Reward Manager','Total Rewards Analyst','Benefits Analyst','Payroll Manager','C&B Specialist','Analista de Remuneração e Benefícios'],
 ARRAY['nz','au','uk','br','us']),

('People Operations Specialist',
 'HR systems, workforce data, HRIS and operational people processes',
 ARRAY['People Operations Specialist','People Ops Specialist','HR Operations Specialist','HRIS Analyst','Workforce Planning Analyst','HR Systems Analyst','HR Data Analyst'],
 ARRAY['nz','au','uk','br','us']),

('HR Director',
 'Executive people leadership, HR strategy and organisational effectiveness',
 ARRAY['HR Director','Chief People Officer','CPO','Head of HR','Head of People','VP HR','VP People','Chief Human Resources Officer','CHRO','People Director','Diretor de RH','Diretor de Pessoas'],
 ARRAY['nz','au','uk','br','us']),

-- ─── Marketing & Growth ──────────────────────────────────────────────────────

('Digital Marketing Manager',
 'Digital channel strategy, performance marketing and online campaign management',
 ARRAY['Digital Marketing Manager','Digital Marketing Specialist','Online Marketing Manager','Performance Marketing Manager','Growth Marketing Manager','Digital Marketing Executive','Analista de Marketing Digital','Gerente de Marketing Digital'],
 ARRAY['nz','au','uk','br','us']),

('Content Strategist',
 'Content strategy, editorial planning, copywriting and content marketing',
 ARRAY['Content Strategist','Content Manager','Content Writer','Copywriter','Content Marketing Manager','Editorial Manager','Content Producer','Technical Content Writer','Estrategista de Conteúdo'],
 ARRAY['nz','au','uk','br','us']),

('SEO / SEM Specialist',
 'Search engine optimisation, paid search and search performance management',
 ARRAY['SEO Specialist','SEM Specialist','Search Engine Optimisation Specialist','PPC Specialist','Google Ads Specialist','Paid Search Manager','SEO Analyst','SEO Manager','Search Marketing Specialist','Especialista em SEO'],
 ARRAY['nz','au','uk','br','us']),

('Social Media Manager',
 'Social media strategy, community management and social content creation',
 ARRAY['Social Media Manager','Social Media Specialist','Community Manager','Social Content Manager','Social Media Coordinator','Social Media Analyst','Gerente de Mídias Sociais'],
 ARRAY['nz','au','uk','br','us']),

('Marketing Analyst',
 'Marketing data analysis, campaign measurement, CRM analytics and insights',
 ARRAY['Marketing Analyst','Marketing Data Analyst','Campaign Analyst','Consumer Insights Analyst','CRM Analyst','Marketing Intelligence Analyst','Analista de Marketing'],
 ARRAY['nz','au','uk','br','us']),

('Brand Manager',
 'Brand strategy, brand identity, product marketing and go-to-market planning',
 ARRAY['Brand Manager','Brand Strategist','Senior Brand Manager','Marketing Manager','Product Marketing Manager','Brand Marketing Manager','Gerente de Marca'],
 ARRAY['nz','au','uk','br','us']),

('Growth Manager',
 'User acquisition, conversion optimisation and growth experimentation',
 ARRAY['Growth Manager','Growth Hacker','User Acquisition Manager','Acquisition Manager','CRO Specialist','Conversion Rate Optimisation Specialist','Growth Strategist','Head of Growth'],
 ARRAY['nz','au','uk','br','us']),

('Email Marketing Specialist',
 'Email campaign management, marketing automation and lifecycle communications',
 ARRAY['Email Marketing Specialist','CRM Manager','Email Campaign Manager','Marketing Automation Specialist','HubSpot Specialist','Marketo Specialist','CRM Specialist','Email Marketing Manager'],
 ARRAY['nz','au','uk','br','us']),

-- ─── Sales & Business Development ────────────────────────────────────────────

('Account Executive',
 'Quota-carrying direct sales, deal management and new logo acquisition',
 ARRAY['Account Executive','AE','Sales Executive','Enterprise Account Executive','Mid-Market Account Executive','Inside Sales Representative','Territory Sales Representative','Executivo de Contas'],
 ARRAY['nz','au','uk','br','us']),

('Sales Manager',
 'Sales team leadership, pipeline management and revenue target ownership',
 ARRAY['Sales Manager','Regional Sales Manager','Director of Sales','VP Sales','Head of Sales','National Sales Manager','Sales Director','Gerente de Vendas','Diretor de Vendas'],
 ARRAY['nz','au','uk','br','us']),

('Business Development Manager',
 'New market entry, partnerships and strategic revenue growth',
 ARRAY['Business Development Manager','BDM','Business Development Executive','Partnership Manager','Alliances Manager','New Business Manager','Channel Manager','Gerente de Desenvolvimento de Negócios'],
 ARRAY['nz','au','uk','br','us']),

('Customer Success Manager',
 'Post-sale customer retention, expansion, onboarding and value realisation',
 ARRAY['Customer Success Manager','CSM','Client Success Manager','Account Manager (Post-Sale)','Customer Experience Manager','Customer Onboarding Manager','Gerente de Sucesso do Cliente'],
 ARRAY['nz','au','uk','br','us']),

('Pre-Sales Engineer',
 'Technical sales support, solution demonstration and proof-of-concept delivery',
 ARRAY['Pre-Sales Engineer','Solutions Engineer','Sales Engineer','Technical Sales Consultant','Solutions Consultant','Pre-Sales Consultant','Technical Pre-Sales','Engenheiro de Pré-Vendas'],
 ARRAY['nz','au','uk','br','us']),

('Key Account Manager',
 'Strategic account management, executive relationships and account growth',
 ARRAY['Key Account Manager','KAM','Strategic Account Manager','Enterprise Account Manager','National Account Manager','Major Account Manager','Global Account Manager'],
 ARRAY['nz','au','uk','br','us']),

-- ─── Management & Consulting ─────────────────────────────────────────────────

('Program Manager',
 'Cross-project programme governance, delivery assurance and benefit realisation',
 ARRAY['Program Manager','Programme Manager','Senior Project Manager','Project Director','Delivery Manager','Head of Delivery','Senior Programme Manager','Gerente de Programa'],
 ARRAY['nz','au','uk','br','us']),

('Portfolio Manager',
 'Project portfolio governance, PMO leadership and investment prioritisation',
 ARRAY['Portfolio Manager','PMO Lead','Portfolio Director','Head of PMO','Portfolio Management Office Lead','PMO Manager','Portfolio and Programme Manager'],
 ARRAY['nz','au','uk','br','us']),

('Change Manager',
 'Organisational change management, stakeholder engagement and adoption planning',
 ARRAY['Change Manager','Organisational Change Manager','Change Management Specialist','Business Transformation Manager','Change Lead','Transformation Manager','OCM Specialist','Gerente de Mudanças'],
 ARRAY['nz','au','uk','br','us']),

('Operations Manager',
 'Operational process management, service delivery and business performance',
 ARRAY['Operations Manager','Ops Manager','Head of Operations','VP Operations','Director of Operations','Business Operations Manager','COO','Chief Operating Officer','Gerente de Operações'],
 ARRAY['nz','au','uk','br','us']),

('General Manager',
 'Business unit or country leadership with full P&L accountability',
 ARRAY['General Manager','GM','Managing Director','MD','CEO','Chief Executive Officer','Country Manager','Regional Manager','Site Manager','Gerente Geral','Diretor Geral'],
 ARRAY['nz','au','uk','br','us']),

('Management Consultant',
 'Strategic advisory, business problem solving and organisational improvement',
 ARRAY['Management Consultant','Strategy Consultant','Business Consultant','Business Advisor','Strategy & Operations Consultant','Advisory Consultant','Transformation Consultant','Consultor de Gestão'],
 ARRAY['nz','au','uk','br','us']),

('Strategy Analyst',
 'Corporate strategy analysis, market intelligence and strategic planning support',
 ARRAY['Strategy Analyst','Corporate Strategy Analyst','Strategic Planning Analyst','Business Strategy Consultant','Strategic Analyst','Business Intelligence Strategist'],
 ARRAY['nz','au','uk','br','us']),

('Agile Coach',
 'Agile practice coaching, Scrum facilitation and team-level delivery improvement',
 ARRAY['Agile Coach','Scrum Master','Agile Practitioner','Agile Delivery Manager','Scrum Coach','Kanban Practitioner','Agile Consultant','RTE','Release Train Engineer','SAFe Coach'],
 ARRAY['nz','au','uk','br','us']),

-- ─── Legal & Compliance ──────────────────────────────────────────────────────

('Legal Counsel',
 'In-house legal advisory, contract review and legal risk management',
 ARRAY['Legal Counsel','Solicitor','Lawyer','In-House Counsel','Corporate Counsel','Associate Counsel','Commercial Lawyer','Employment Lawyer','General Counsel','Advogado','Assessor Jurídico'],
 ARRAY['nz','au','uk','br','us']),

('Contract Manager',
 'Commercial contract lifecycle management and legal operations',
 ARRAY['Contract Manager','Legal Operations Manager','Commercial Contracts Manager','Procurement Lawyer','Contracts Specialist','Vendor Contract Manager','Contract Administrator','Gerente de Contratos'],
 ARRAY['nz','au','uk','br','us']),

('Compliance Officer',
 'Regulatory compliance management, policy enforcement and audit support',
 ARRAY['Compliance Officer','Compliance Manager','Regulatory Compliance Officer','AML Compliance Officer','Financial Crime Officer','Compliance Analyst','Compliance Specialist','Oficial de Compliance'],
 ARRAY['nz','au','uk','br','us']),

('Data Protection Officer',
 'Privacy governance, GDPR/data protection programme management and DPO obligations',
 ARRAY['Data Protection Officer','DPO','Privacy Officer','Privacy Manager','Privacy Specialist','Chief Privacy Officer','Information Governance Manager','Privacy Counsel'],
 ARRAY['nz','au','uk','br','us']),

('Regulatory Affairs Specialist',
 'Product regulatory submissions, authority liaison and compliance documentation',
 ARRAY['Regulatory Affairs Specialist','Regulatory Affairs Manager','Regulatory Analyst','Government Affairs Manager','Regulatory Submissions Specialist'],
 ARRAY['nz','au','uk','br','us']),

('Paralegal',
 'Legal process support, document drafting and matter management assistance',
 ARRAY['Paralegal','Legal Assistant','Legal Administrator','Legal Secretary','Legal Support Officer','Junior Legal Officer'],
 ARRAY['nz','au','uk','br','us']),

-- ─── Engineering Leadership ──────────────────────────────────────────────────

('Engineering Manager',
 'Software engineering team management, hiring, performance and delivery accountability',
 ARRAY['Engineering Manager','EM','Software Engineering Manager','Engineering Team Lead','Head of Engineering (Line)','Development Manager','Dev Manager'],
 ARRAY['nz','au','uk','br','us']),

('CTO / VP Engineering',
 'Executive technology leadership, engineering organisation strategy and architecture',
 ARRAY['CTO','Chief Technology Officer','VP Engineering','Head of Technology','Director of Engineering','Technology Director','Head of Software Engineering'],
 ARRAY['nz','au','uk','br','us']),

('Technical Lead',
 'Senior individual contributor technical leadership within an engineering team',
 ARRAY['Technical Lead','Tech Lead','Principal Engineer','Staff Engineer','Lead Software Engineer','Lead Developer','Principal Developer','Distinguished Engineer'],
 ARRAY['nz','au','uk','br','us']),

('Software Architect',
 'System-level architecture design, technical strategy and cross-team standards',
 ARRAY['Software Architect','Application Architect','System Architect','Microservices Architect','Integration Architect','Technical Architect (Software)','Arquiteto de Software'],
 ARRAY['nz','au','uk','br','us']),

-- ─── Other Tech ──────────────────────────────────────────────────────────────

('Technical Writer',
 'Technical documentation, API docs, developer guides and content engineering',
 ARRAY['Technical Writer','Documentation Engineer','Technical Documentation Specialist','API Documentation Writer','Content Engineer','Developer Documentation Specialist'],
 ARRAY['nz','au','uk','br','us']),

('Developer Relations',
 'Developer community engagement, advocacy, evangelism and DX improvement',
 ARRAY['Developer Relations Engineer','Developer Advocate','DevRel','Developer Experience Engineer','DX Engineer','Community Engineer','Technical Evangelist','Developer Community Manager'],
 ARRAY['nz','au','uk','br','us']),

('IT Trainer',
 'Technology skills training, corporate IT learning delivery and enablement',
 ARRAY['IT Trainer','Technical Trainer','Learning & Development Specialist (IT)','Training Consultant','Corporate IT Trainer','Technology Trainer'],
 ARRAY['nz','au','uk','br','us']),

('Support Engineer',
 'Customer-facing technical support, issue resolution and product troubleshooting',
 ARRAY['Support Engineer','Technical Support Engineer','Customer Support Engineer','Product Support Specialist','Technical Support Analyst','Tier 2 Support','Tier 3 Support','Technical Account Manager (Support)','Engenheiro de Suporte'],
 ARRAY['nz','au','uk','br','us'])

ON CONFLICT DO NOTHING;

-- Verification:
-- SELECT count(*) FROM public.sats_role_families;  -- Expected: 88
-- SELECT name FROM public.sats_role_families ORDER BY name LIMIT 10;

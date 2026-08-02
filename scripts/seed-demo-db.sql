-- Sample database for DBoard testing
-- Demonstrates tables, PKs, FKs, various data types

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    budget NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    salary NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT true,
    department_id INTEGER REFERENCES departments(id),
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    budget NUMERIC(12, 2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    lead_id INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id INTEGER REFERENCES employees(id),
    estimated_hours NUMERIC(6, 2),
    due_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE time_entries (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id),
    hours NUMERIC(5, 2) NOT NULL,
    description TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sample data
INSERT INTO departments (name, budget) VALUES
    ('Engineering', 500000.00),
    ('Marketing', 200000.00),
    ('Sales', 300000.00),
    ('Human Resources', 150000.00);

INSERT INTO employees (first_name, last_name, email, salary, department_id, hire_date) VALUES
    ('Alice', 'Johnson', 'alice@example.com', 95000.00, 1, '2022-03-15'),
    ('Bob', 'Smith', 'bob@example.com', 82000.00, 1, '2023-01-10'),
    ('Carol', 'Williams', 'carol@example.com', 75000.00, 2, '2021-11-01'),
    ('David', 'Brown', 'david@example.com', 88000.00, 3, '2022-06-20'),
    ('Eve', 'Davis', 'eve@example.com', 72000.00, 4, '2023-09-05'),
    ('Frank', 'Miller', 'frank@example.com', 91000.00, 1, '2021-04-12'),
    ('Grace', 'Wilson', 'grace@example.com', 67000.00, 2, '2024-01-08');

INSERT INTO projects (name, description, start_date, end_date, budget, status, lead_id) VALUES
    ('Website Redesign', 'Redesign company website with new brand guidelines', '2024-01-15', '2024-06-30', 80000.00, 'active', 1),
    ('Mobile App v2', 'Version 2 of the mobile application', '2024-03-01', '2024-09-30', 120000.00, 'active', 6),
    ('Q1 Marketing Campaign', 'Quarterly marketing campaign', '2024-01-01', '2024-03-31', 30000.00, 'completed', 3),
    ('Data Migration', 'Migrate legacy data to new system', '2024-04-01', NULL, 50000.00, 'on_hold', 2);

INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, estimated_hours, due_date) VALUES
    ('Design mockups', 'Create wireframes and mockups for new website', 'done', 'high', 1, 1, 40, '2024-02-15'),
    ('Frontend development', 'Implement React components for redesign', 'in_progress', 'high', 1, 2, 120, '2024-05-01'),
    ('Backend API updates', 'Update REST APIs for new frontend', 'todo', 'medium', 1, 6, 80, '2024-04-15'),
    ('User authentication', 'Implement OAuth2 login flow', 'in_progress', 'high', 2, 6, 60, '2024-04-30'),
    ('Push notifications', 'Add push notification support', 'todo', 'medium', 2, 2, 40, '2024-06-01'),
    ('Social media ads', 'Create and schedule social media ads', 'done', 'medium', 3, 3, 20, '2024-02-01'),
    ('Email campaign', 'Design and send email campaign', 'review', 'low', 3, 7, 15, '2024-03-15'),
    ('Data audit', 'Audit existing data for migration', 'in_progress', 'urgent', 4, 4, 30, '2024-04-15');

INSERT INTO time_entries (task_id, employee_id, hours, description, entry_date) VALUES
    (1, 1, 8, 'Homepage wireframes', '2024-01-20'),
    (1, 1, 6, 'About page mockup', '2024-01-21'),
    (2, 2, 7.5, 'Setup Next.js project', '2024-02-01'),
    (2, 2, 8, 'Navigation component', '2024-02-02'),
    (4, 6, 6, 'OAuth research', '2024-03-10'),
    (4, 6, 8, 'Google OAuth integration', '2024-03-11'),
    (6, 3, 4, 'Facebook ad creation', '2024-01-15'),
    (6, 3, 3, 'Twitter ad creation', '2024-01-16'),
    (8, 4, 7, 'Legacy data export', '2024-04-01'),
    (8, 4, 6.5, 'Data validation', '2024-04-02');

-- Users table
CREATE TABLE users (
    id VARCHAR2(36) PRIMARY KEY,
    email VARCHAR2(255) NOT NULL UNIQUE,
    password VARCHAR2(255) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    department VARCHAR2(100) NOT NULL,
    is_admin NUMBER(1) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT SYSDATE NOT NULL,
    updated_at TIMESTAMP DEFAULT SYSDATE NOT NULL
);

-- Create question templates table
CREATE TABLE question_templates (
    id VARCHAR2(36) PRIMARY KEY,
    department VARCHAR2(50) NOT NULL,
    questions CLOB NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Create feedback periods table
CREATE TABLE feedback_periods (
    id VARCHAR2(36) PRIMARY KEY,
    department VARCHAR2(50) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    questions CLOB NOT NULL,
    active NUMBER(1) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Create feedbacks table
CREATE TABLE feedbacks (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    user_name VARCHAR2(100) NOT NULL,
    user_email VARCHAR2(100) NOT NULL,
    user_department VARCHAR2(50) NOT NULL,
    target_department VARCHAR2(50) NOT NULL,
    additional_comment CLOB,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Create feedback_questions table
CREATE TABLE feedback_questions (
    id VARCHAR2(36) PRIMARY KEY,
    feedback_id VARCHAR2(36) NOT NULL,
    text VARCHAR2(500) NOT NULL,
    rating NUMBER(2) NOT NULL,
    FOREIGN KEY (feedback_id) REFERENCES feedbacks(id)
);

-- Create sequence for user IDs
CREATE SEQUENCE user_id_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE TRIGGER users_update_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSDATE;
END;
/

-- Departments table (optional, if you want to enforce valid departments)
CREATE TABLE departments (
    name VARCHAR2(100) PRIMARY KEY,
    description VARCHAR2(500),
    created_at TIMESTAMP DEFAULT SYSDATE NOT NULL
);

-- Insert default departments
INSERT INTO departments (name, description) VALUES ('IT', 'Information Technology Department');
INSERT INTO departments (name, description) VALUES ('HR', 'Human Resources Department');
INSERT INTO departments (name, description) VALUES ('Finance', 'Finance Department');
INSERT INTO departments (name, description) VALUES ('Marketing', 'Marketing Department');
INSERT INTO departments (name, description) VALUES ('Operations', 'Operations Department');

-- Add foreign key constraint to users table
ALTER TABLE users
ADD CONSTRAINT fk_users_department
FOREIGN KEY (department)
REFERENCES departments(name);

-- Comments for better documentation
COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user';
COMMENT ON COLUMN users.email IS 'User email address (must be unique)';
COMMENT ON COLUMN users.password IS 'Hashed password';
COMMENT ON COLUMN users.name IS 'User full name';
COMMENT ON COLUMN users.department IS 'User department';
COMMENT ON COLUMN users.is_admin IS 'Flag indicating if user is an administrator (1) or regular user (0)';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the user was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when the user was last updated';

-- Create view for user information (excluding sensitive data)
CREATE OR REPLACE VIEW user_info AS
SELECT 
    id,
    email,
    name,
    department,
    is_admin,
    created_at
FROM users;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO your_app_user;
GRANT SELECT ON departments TO your_app_user;
GRANT SELECT ON user_info TO your_app_user;




-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_feedbacks_target_department ON feedbacks(target_department);
CREATE INDEX idx_feedback_questions_feedback_id ON feedback_questions(feedback_id);
CREATE INDEX idx_question_templates_department ON question_templates(department);
CREATE INDEX idx_feedback_periods_department ON feedback_periods(department);
CREATE INDEX idx_feedback_periods_active ON feedback_periods(active);
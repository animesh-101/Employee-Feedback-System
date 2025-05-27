-- Users table
CREATE TABLE users (
    id VARCHAR2(36) PRIMARY KEY,
    email VARCHAR2(255) NOT NULL UNIQUE,
    password VARCHAR2(255) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    department VARCHAR2(100) NOT NULL,
    is_admin NUMBER(1) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
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
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

-- Departments table
CREATE TABLE departments (
    name VARCHAR2(100) PRIMARY KEY,
    description VARCHAR2(500),
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);

-- Insert all departments
INSERT INTO departments (name, description) VALUES ('IT', 'Information Technology Department');
INSERT INTO departments (name, description) VALUES ('Accounts', 'Accounts and Finance Department');
INSERT INTO departments (name, description) VALUES ('Material', 'Material Management Department');
INSERT INTO departments (name, description) VALUES ('HR', 'Human Resources Department');
INSERT INTO departments (name, description) VALUES ('Production', 'Production Department');
INSERT INTO departments (name, description) VALUES ('Refinery Engg', 'Refinery Engineering Department');
INSERT INTO departments (name, description) VALUES ('CGPP engg', 'CGPP Engineering Department');
INSERT INTO departments (name, description) VALUES ('Civil', 'Civil Engineering Department');
INSERT INTO departments (name, description) VALUES ('Mechanical Engg', 'Mechanical Engineering Department');
INSERT INTO departments (name, description) VALUES ('Electrical Engg', 'Electrical Engineering Department');
INSERT INTO departments (name, description) VALUES ('Instrument', 'Instrumentation Department');
INSERT INTO departments (name, description) VALUES ('Technical', 'Technical Department');
INSERT INTO departments (name, description) VALUES ('WCM', 'World Class Manufacturing Department');
INSERT INTO departments (name, description) VALUES ('Safety', 'Safety Department');

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

-- Create question templates table
CREATE TABLE question_templates (
    id VARCHAR2(36) PRIMARY KEY,
    department VARCHAR2(100) NOT NULL,
    questions CLOB NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_qt_department FOREIGN KEY (department) REFERENCES departments(name)
);

-- Create feedback periods table
CREATE TABLE feedback_periods (
    id VARCHAR2(36) PRIMARY KEY,
    department VARCHAR2(100) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    questions CLOB NOT NULL,
    active NUMBER(1) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_fp_department FOREIGN KEY (department) REFERENCES departments(name),
    CONSTRAINT chk_fp_dates CHECK (end_date > start_date)
);

-- Create feedbacks table
CREATE TABLE feedbacks (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(36) NOT NULL,
    user_name VARCHAR2(255) NOT NULL,
    user_email VARCHAR2(255) NOT NULL,
    user_department VARCHAR2(100) NOT NULL,
    target_department VARCHAR2(100) NOT NULL,
    questions CLOB NOT NULL,
    additional_comment CLOB,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_fb_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_fb_user_dept FOREIGN KEY (user_department) REFERENCES departments(name),
    CONSTRAINT fk_fb_target_dept FOREIGN KEY (target_department) REFERENCES departments(name)
);

-- Create feedback questions table
CREATE TABLE feedback_questions (
    id VARCHAR2(36) PRIMARY KEY,
    feedback_id VARCHAR2(36) NOT NULL,
    text CLOB NOT NULL,
    rating NUMBER NOT NULL,
    comments CLOB,
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT fk_fq_feedback FOREIGN KEY (feedback_id) REFERENCES feedbacks(id)
);

-- Create sequence for feedback questions
CREATE SEQUENCE feedback_question_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- Create trigger for feedback questions ID
CREATE OR REPLACE TRIGGER trg_feedback_questions_id
    BEFORE INSERT ON feedback_questions
    FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        :NEW.id := 'FQ' || LPAD(feedback_question_seq.NEXTVAL, 8, '0');
    END IF;
END;
/

-- Create sequences for IDs
CREATE SEQUENCE question_template_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE feedback_period_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE feedback_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_feedbacks_target_department ON feedbacks(target_department);
CREATE INDEX idx_question_templates_department ON question_templates(department);
CREATE INDEX idx_feedback_periods_department ON feedback_periods(department);
CREATE INDEX idx_feedback_periods_active ON feedback_periods(active);
CREATE INDEX idx_feedback_periods_dates ON feedback_periods(start_date, end_date);

-- Create triggers for automatic ID generation
CREATE OR REPLACE TRIGGER trg_question_templates_id
    BEFORE INSERT ON question_templates
    FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        :NEW.id := 'QT' || LPAD(question_template_seq.NEXTVAL, 8, '0');
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_feedback_periods_id
    BEFORE INSERT ON feedback_periods
    FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        :NEW.id := 'FP' || LPAD(feedback_period_seq.NEXTVAL, 8, '0');
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_feedbacks_id
    BEFORE INSERT ON feedbacks
    FOR EACH ROW
BEGIN
    IF :NEW.id IS NULL THEN
        :NEW.id := 'FB' || LPAD(feedback_seq.NEXTVAL, 8, '0');
    END IF;
END;
/

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO your_app_user;
GRANT SELECT ON departments TO your_app_user;
GRANT SELECT ON user_info TO your_app_user;
GRANT SELECT, INSERT, UPDATE ON question_templates TO your_app_user;
GRANT SELECT, INSERT, UPDATE ON feedback_periods TO your_app_user;
GRANT SELECT, INSERT ON feedbacks TO your_app_user;
GRANT SELECT, INSERT ON feedback_questions TO your_app_user;
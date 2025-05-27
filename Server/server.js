const express = require('express');
const oracledb = require('oracledb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Oracle DB configuration
const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION_STRING,
  poolMin: 1,
  poolMax: 10,
  poolIncrement: 1
};

const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN
};


// Initialize Oracle connection pool
async function initialize() {
  try {
    await oracledb.createPool(dbConfig);
    console.log('Oracle connection pool created');
  } catch (err) {
    console.error('Error creating Oracle connection pool:', err);
  }
}

// Get all feedbacks with department statistics
app.get('/api/feedbacks', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    
    // Query to get all feedbacks
    const feedbackQuery = `
      SELECT 
        f.id,
        f.user_id,
        f.user_name,
        f.user_email,
        f.user_department,
        f.target_department,
        f.questions,
        f.additional_comment,
        f.created_at
      FROM feedbacks f
      ORDER BY f.created_at DESC
    `;
    
    const result = await connection.execute(feedbackQuery, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    
    // Process the results to match the frontend structure
    const feedbacks = await Promise.all(result.rows.map(async row => {
      // Parse the questions CLOB into JSON
      let questions = [];
      try {
        const clob = row.QUESTIONS;
        if (clob) {
          const questionsString = await clob.getData();
          questions = JSON.parse(questionsString);
        }
      } catch (err) {
        console.error('Error parsing questions JSON:', err);
      }

      // Get additional comment from CLOB
      let additionalComment = null;
      try {
        const commentClob = row.ADDITIONAL_COMMENT;
        if (commentClob) {
          additionalComment = await commentClob.getData();
        }
      } catch (err) {
        console.error('Error reading additional comment:', err);
      }

      return {
        id: row.ID,
        userId: row.USER_ID,
        userName: row.USER_NAME,
        userEmail: row.USER_EMAIL,
        userDepartment: row.USER_DEPARTMENT,
        targetDepartment: row.TARGET_DEPARTMENT,
        questions: questions,
        additionalComment: additionalComment,
        createdAt: new Date(row.CREATED_AT)
      };
    }));
    
    // Calculate department statistics
    const departmentStats = [];
    const departments = ['IT', 'Accounts', 'Material', 'HR', 'Production', 
                        'Refinery Engg', 'CGPP engg', 'Civil', 'Mechanical Engg', 
                        'Electrical Engg', 'Instrument', 'Technical', 'WCM', 'Safety'];
    
    departments.forEach(department => {
      const departmentFeedbacks = feedbacks.filter(f => f.targetDepartment === department);
      
      if (departmentFeedbacks.length === 0) {
        departmentStats.push({
          department,
          averageRating: 0,
          totalFeedbacks: 0,
          questionStats: []
        });
        return;
      }
      
      // Calculate statistics for each question
      const questionStats = [];
      const questionMap = new Map();
      
      // First, collect all unique questions and their ratings
      departmentFeedbacks.forEach(feedback => {
        feedback.questions.forEach(q => {
          if (!questionMap.has(q.id)) {
            questionMap.set(q.id, {
              questionId: q.id,
              questionText: q.text,
              totalRating: 0,
              count: 0
            });
          }
          const stats = questionMap.get(q.id);
          stats.totalRating += q.rating;
          stats.count++;
        });
      });
      
      // Calculate averages for each question
      questionMap.forEach(stats => {
        questionStats.push({
          questionId: stats.questionId,
          questionText: stats.questionText,
          averageRating: stats.count > 0 ? stats.totalRating / stats.count : 0
        });
      });
      
      // Calculate overall average rating
      let totalRating = 0;
      let totalQuestions = 0;
      
      departmentFeedbacks.forEach(feedback => {
        feedback.questions.forEach(question => {
          totalRating += question.rating;
          totalQuestions++;
        });
      });
      
      departmentStats.push({
        department,
        averageRating: totalQuestions > 0 ? totalRating / totalQuestions : 0,
        totalFeedbacks: departmentFeedbacks.length,
        questionStats
      });
    });
    
    res.json({
      feedbacks,
      departmentStats,
      totalFeedbacks: feedbacks.length
    });
    
  } catch (err) {
    console.error('Error fetching feedbacks:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}); 

// Get feedbacks by department
app.get('/api/feedbacks/department/:department', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    
    const department = req.params.department;
    
    const feedbackQuery = `
      SELECT 
        f.id,
        f.user_id,
        f.user_name,
        f.user_email,
        f.user_department,
        f.target_department,
        f.additional_comment,
        f.created_at,
        q.id as question_id,
        q.text as question_text,
        q.rating
      FROM feedbacks f
      LEFT JOIN feedback_questions q ON f.id = q.feedback_id
      WHERE f.target_department = :department
      ORDER BY f.created_at DESC
    `;
    
    const result = await connection.execute(feedbackQuery, [department], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    
    // Process the results similar to the main feedbacks endpoint
    const feedbacks = [];
    const feedbackMap = new Map();
    
    result.rows.forEach(row => {
      if (!feedbackMap.has(row.ID)) {
        feedbackMap.set(row.ID, {
          id: row.ID,
          userId: row.USER_ID,
          userName: row.USER_NAME,
          userEmail: row.USER_EMAIL,
          userDepartment: row.USER_DEPARTMENT,
          targetDepartment: row.TARGET_DEPARTMENT,
          additionalComment: row.ADDITIONAL_COMMENT,
          createdAt: new Date(row.CREATED_AT),
          questions: []
        });
      }
      
      if (row.QUESTION_ID) {
        feedbackMap.get(row.ID).questions.push({
          id: row.QUESTION_ID,
          text: row.QUESTION_TEXT,
          rating: row.RATING
        });
      }
    });
    
    feedbacks.push(...feedbackMap.values());
    
    res.json(feedbacks);
    
  } catch (err) {
    console.error('Error fetching department feedbacks:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Get question templates by department
app.get('/api/question-templates/:department', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const department = req.params.department;
    
    const result = await connection.execute(
      `SELECT id, department, questions, created_at 
       FROM question_templates 
       WHERE department = :department`,
      [department],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No template found for this department' });
    }
    
    const template = result.rows[0];
    let questions = [];
    
    try {
      // Get the CLOB data
      const clob = template.QUESTIONS;
      if (clob) {
        // Read the CLOB data
        const questionsString = await clob.getData();
        // Parse the JSON string
        questions = JSON.parse(questionsString);
      }
    } catch (err) {
      console.error('Error parsing questions for template:', template.ID, err);
      questions = [];
    }
    
    // Return a clean JSON object
    res.json({
      id: template.ID,
      department: template.DEPARTMENT,
      questions: questions,
      createdAt: template.CREATED_AT
    });
    
  } catch (err) {
    console.error('Error fetching question template:', err);
    res.status(500).json({ error: 'Failed to load template questions' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}); 

// Get all feedback periods
app.get('/api/feedback-periods', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    
    const result = await connection.execute(
      `SELECT * FROM feedback_periods ORDER BY created_at DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    // Process the results with proper CLOB handling
    const periods = await Promise.all(result.rows.map(async row => {
      let questions = [];
      try {
        // Get the CLOB data
        const clob = row.QUESTIONS;
        if (clob) {
          // Read the CLOB data
          const questionsString = await clob.getData();
          // Parse the JSON string
          questions = JSON.parse(questionsString);
        }
      } catch (err) {
        console.error('Error parsing questions for period:', row.ID, err);
        questions = [];
      }

      return {
        id: row.ID,
        department: row.DEPARTMENT,
        startDate: new Date(row.START_DATE),
        endDate: new Date(row.END_DATE),
        active: row.ACTIVE === 1,
        questions: questions,
        createdAt: new Date(row.CREATED_AT)
      };
    }));
    
    res.json(periods);
  } catch (err) {
    console.error('Error fetching feedback periods:', err);
    res.status(500).json({ error: 'Failed to load feedback periods' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Create new feedback period
app.post('/api/feedback-periods', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const { department, startDate, endDate, questions } = req.body;
    
    const periodId = uuidv4();
    const questionsJson = JSON.stringify(questions);
    
    await connection.execute(
      `INSERT INTO feedback_periods (
        id, department, start_date, end_date, questions, active, created_at
      ) VALUES (
        :id, :department, :startDate, :endDate, :questions, 1, SYSTIMESTAMP
      )`,
      {
        id: periodId,
        department,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        questions: questionsJson
      }
    );
    
    await connection.commit();
    
    // Return the period with the original questions
    const period = {
      id: periodId,
      department,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      questions: questions,
      active: true,
      createdAt: new Date()
    };
    
    res.status(201).json(period);
  } catch (err) {
    console.error('Error creating feedback period:', err);
    res.status(500).json({ error: 'Failed to create feedback period' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}); 

// Toggle feedback period active status
app.patch('/api/feedback-periods/:id/toggle', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const { id } = req.params;
    const { currentActive } = req.body;
    
    await connection.execute(
      `UPDATE feedback_periods SET active = :newActive WHERE id = :id`,
      {
        newActive: currentActive ? 0 : 1,
        id
      }
    );
    
    await connection.commit();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error toggling feedback period:', err);
    res.status(500).json({ error: 'Failed to update feedback period' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Delete feedback period
app.delete('/api/feedback-periods/:id', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const { id } = req.params;
    
    await connection.execute(
      `DELETE FROM feedback_periods WHERE id = :id`,
      [id]
    );
    
    await connection.commit();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting feedback period:', err);
    res.status(500).json({ error: 'Failed to delete feedback period' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Create question template
app.post('/api/question-templates', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const { department, questions } = req.body;
    
    // Validate input
    if (!department || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Department and questions are required' });
    }

    // Validate each question has required fields
    if (!questions.every(q => q.id && q.text && q.type)) {
      return res.status(400).json({ error: 'Each question must have id, text, and type' });
    }
    
    // Convert questions to string before storing
    const questionsString = JSON.stringify(questions);
    
    // Generate template ID using the sequence
    const result = await connection.execute(
      `INSERT INTO question_templates (
        department, questions, created_at
      ) VALUES (
        :department, :questions, SYSTIMESTAMP
      ) RETURNING id INTO :id`,
      {
        department,
        questions: questionsString,
        id: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
      }
    );
    
    await connection.commit();
    
    // Return the template with the original questions
    res.status(201).json({
      id: result.outBinds.id[0],
      department,
      questions,
      createdAt: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Error creating question template:', err);
    res.status(500).json({ error: 'Failed to create template' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Get all question templates
app.get('/api/question-templates', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    
    const result = await connection.execute(
      `SELECT id, department, questions, created_at FROM question_templates ORDER BY created_at DESC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    // Parse the questions CLOB for each template
    const templates = await Promise.all(result.rows.map(async template => {
      let questions = [];
      try {
        // Get the CLOB data
        const clob = template.QUESTIONS;
        if (clob) {
          // Read the CLOB data
          const questionsString = await clob.getData();
          // Parse the JSON string
          questions = JSON.parse(questionsString);
        }
      } catch (err) {
        console.error('Error parsing questions for template:', template.ID, err);
        questions = [];
      }
      
      return {
        id: template.ID,
        department: template.DEPARTMENT,
        questions: questions,
        createdAt: template.CREATED_AT
      };
    }));
    
    res.json(templates);
    
  } catch (err) {
    console.error('Error fetching question templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}); 

// Update question template
app.put('/api/question-templates/:id', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const { id } = req.params;
    const { department, questions } = req.body;
    
    const questionsJson = JSON.stringify(questions);
    
    await connection.execute(
      `UPDATE question_templates 
       SET department = :department,
           questions = :questions
       WHERE id = :id`,
      {
        id,
        department,
        questions: questionsJson
      }
    );
    
    await connection.commit();
    
    // Fetch the updated template
    const result = await connection.execute(
      `SELECT * FROM question_templates WHERE id = :id`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    const template = {
      ...result.rows[0],
      questions: JSON.parse(result.rows[0].QUESTIONS)
    };
    
    res.json(template);
  } catch (err) {
    console.error('Error updating question template:', err);
    res.status(500).json({ error: 'Failed to update template' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Delete question template
app.delete('/api/question-templates/:id', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const { id } = req.params;
    
    await connection.execute(
      `DELETE FROM question_templates WHERE id = :id`,
      [id]
    );
    
    await connection.commit();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting question template:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});


// Get available feedback periods for a user
app.get('/api/available-feedbacks', async (req, res) => {
  let connection;
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    connection = await oracledb.getConnection(dbConfig);
    
    // Get active feedback periods
    const periodsResult = await connection.execute(
      `SELECT 
        id,
        department,
        start_date,
        end_date,
        questions,
        active,
        created_at
       FROM feedback_periods 
       WHERE active = 1 
       AND end_date > SYSTIMESTAMP
       ORDER BY end_date ASC`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Get user's submitted feedbacks
    const submittedResult = await connection.execute(
      `SELECT target_department 
       FROM feedbacks 
       WHERE user_id = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // Process the results
    const periods = await Promise.all(periodsResult.rows.map(async row => {
      let questions = [];
      try {
        // Get the CLOB data
        const clob = row.QUESTIONS;
        if (clob) {
          // Read the CLOB data
          const questionsString = await clob.getData();
          // Parse the JSON string
          questions = JSON.parse(questionsString);
        }
      } catch (err) {
        console.error('Error parsing questions for period:', row.ID, err);
        questions = [];
      }

      return {
        id: row.ID,
        department: row.DEPARTMENT,
        startDate: new Date(row.START_DATE),
        endDate: new Date(row.END_DATE),
        active: row.ACTIVE === 1,
        questions: questions,
        createdAt: new Date(row.CREATED_AT)
      };
    }));

    const submittedDepartments = submittedResult.rows.map(row => row.TARGET_DEPARTMENT);

    res.json({
      feedbackPeriods: periods,
      submittedDepartments
    });

  } catch (err) {
    console.error('Error fetching available feedbacks:', err);
    res.status(500).json({ error: 'Failed to fetch available feedbacks' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Get feedback period
app.get('/api/feedback-periods/:id', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const { id } = req.params;
    const { userId } = req.query;

    const result = await connection.execute(
      `SELECT * FROM feedback_periods 
       WHERE id = :id AND active = 1`,
      [id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback period not found' });
    }

    const period = result.rows[0];
    let questions = [];
    
    try {
      // Get the CLOB data
      const clob = period.QUESTIONS;
      if (clob) {
        // Read the CLOB data
        const questionsString = await clob.getData();
        // Parse the JSON string
        questions = JSON.parse(questionsString);
      }
    } catch (err) {
      console.error('Error parsing questions for period:', period.ID, err);
      questions = [];
    }

    // Return a clean response
    res.json({
      id: period.ID,
      department: period.DEPARTMENT,
      startDate: new Date(period.START_DATE),
      endDate: new Date(period.END_DATE),
      active: period.ACTIVE === 1,
      questions: questions,
      createdAt: new Date(period.CREATED_AT)
    });

  } catch (err) {
    console.error('Error fetching feedback period:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}); 

// Submit feedback
app.post('/api/feedbacks', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const {
      userId,
      userName,
      userEmail,
      userDepartment,
      targetDepartment,
      questions,
      additionalComment
    } = req.body;

    // Convert questions to JSON string for storage
    const questionsJson = JSON.stringify(questions);

    // Insert feedback with CLOB handling
    const feedbackResult = await connection.execute(
      `INSERT INTO feedbacks (
        id, user_id, user_name, user_email, user_department,
        target_department, questions, additional_comment, created_at
      ) VALUES (
        'FB' || LPAD(feedback_seq.NEXTVAL, 8, '0'),
        :userId, :userName, :userEmail, :userDepartment,
        :targetDepartment, :questions, :additionalComment, SYSTIMESTAMP
      ) RETURNING id INTO :id`,
      {
        userId,
        userName,
        userEmail,
        userDepartment,
        targetDepartment,
        questions: { dir: oracledb.BIND_IN, type: oracledb.CLOB, val: questionsJson },
        additionalComment: { dir: oracledb.BIND_IN, type: oracledb.CLOB, val: additionalComment || null },
        id: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
      }
    );

    const feedbackId = feedbackResult.outBinds.id[0];

    // Insert questions with CLOB handling
    for (const question of questions) {
      await connection.execute(
        `INSERT INTO feedback_questions (
          id, feedback_id, text, rating, comments, created_at
        ) VALUES (
          'FQ' || LPAD(feedback_question_seq.NEXTVAL, 8, '0'),
          :feedbackId, :text, :rating, :comments, SYSTIMESTAMP
        )`,
        {
          feedbackId,
          text: { dir: oracledb.BIND_IN, type: oracledb.CLOB, val: question.text },
          rating: question.rating,
          comments: { dir: oracledb.BIND_IN, type: oracledb.CLOB, val: question.comment || null }
        }
      );
    }

    // Commit transaction
    await connection.commit();

    res.json({ id: feedbackId, message: 'Feedback submitted successfully' });
  } catch (err) {
    // Rollback on error
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('Error rolling back transaction:', rollbackErr);
      }
    }
    console.error('Error submitting feedback:', err);
    res.status(500).json({ error: err.message || 'Failed to submit feedback' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});  
// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  let connection;
  try {
    const { email, password, name, department } = req.body;

    if (!email || !password || !name || !department) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    connection = await oracledb.getConnection(dbConfig);
    
    // Check if email already exists
    const checkResult = await connection.execute(
      `SELECT id FROM users WHERE email = :email`,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate user ID using sequence
    const userIdResult = await connection.execute(
      `SELECT 'USR' || LPAD(user_id_seq.NEXTVAL, 8, '0') as new_id FROM dual`
    );
    const userId = userIdResult.rows[0][0];

    // Create new user
    await connection.execute(
      `INSERT INTO users (
        id,
        email,
        password,
        name,
        department,
        is_admin,
        created_at,
        updated_at
      ) VALUES (
        :id,
        :email,
        :password,
        :name,
        :department,
        0,
        SYSTIMESTAMP,
        SYSTIMESTAMP
      )`,
      {
        id: userId,
        email,
        password: hashedPassword,
        name,
        department
      }
    );

    await connection.commit();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: userId,
        email,
        name,
        department,
        isAdmin: false
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: userId,
        email,
        name,
        department,
        isAdmin: false
      }
    });

  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).json({ error: 'Failed to create account' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});


// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    connection = await oracledb.getConnection(dbConfig);

    // Get user with password and is_admin field
    const result = await connection.execute(
      `SELECT u.id, u.email, u.name, u.department, u.password, u.is_admin
       FROM users u
       WHERE u.email = :email`,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Debug log for raw IS_ADMIN value
    console.log('Raw IS_ADMIN value from DB:', user.IS_ADMIN, 'Type:', typeof user.IS_ADMIN);

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.PASSWORD);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Convert Oracle number to boolean for isAdmin
    // Oracle returns numbers as strings in some cases, so we need to handle both
    const isAdmin = Number(user.IS_ADMIN) === 1;
    console.log('Converted isAdmin value:', isAdmin, 'Type:', typeof isAdmin);

    // Generate JWT token with role information
    const token = jwt.sign(
      { 
        id: user.ID,
        email: user.EMAIL,
        isAdmin: isAdmin,
        department: user.DEPARTMENT,
        role: isAdmin ? 'admin' : 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userResponse = {
      id: user.ID,
      email: user.EMAIL,
      name: user.NAME,
      department: user.DEPARTMENT,
      isAdmin: isAdmin,
      role: isAdmin ? 'admin' : 'user'
    };

    console.log('Sending user response:', userResponse);

    // Return user data without password
    res.json({
      token,
      user: userResponse
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}); 


// Verify authentication token and get user role
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    
    const result = await connection.execute(
      `SELECT id, email, name, department, is_admin 
       FROM users 
       WHERE id = :userId`,
      [req.user.id],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.ID,
      email: user.EMAIL,
      name: user.NAME,
      department: user.DEPARTMENT,
      isAdmin: user.IS_ADMIN === 1
    });
  } catch (err) {
    console.error('Error verifying user:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the server
const PORT = process.env.PORT || 3001;
initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
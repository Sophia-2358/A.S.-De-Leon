import * as userModel from '../models/User.js';
import bcrypt from 'bcryptjs';

// ==========================================
// FETCH ALL EMPLOYEES
// ==========================================
export const fetchAllEmployees = async () => {
    const employees = await userModel.fetchAll();
    return employees;
};

// ==========================================
// FETCH ONE EMPLOYEE BY ID
// ==========================================
export const fetchEmployeeById = async (id) => {
    const rows = await userModel.findById(id);

    if (rows.length === 0) {
        throw new Error('Employee not found.');
    }

    return rows[0];
};

// ==========================================
// CREATE EMPLOYEE
// ==========================================
export const createEmployee = async (data) => {
    const { full_name, username, employee_code, position, email, password } = data;

    // Validate required fields
    if (!full_name || !username || !employee_code || !password) {
        throw new Error('full_name, username, employee_code, and password are required.');
    }

    // Validate password length
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
    }

    // Check for duplicate username
    const existingUsername = await userModel.findByUsername(username.trim());
    if (existingUsername.length > 0) {
        throw new Error('Username is already taken.');
    }

    // Check for duplicate employee_code
    const existingCode = await userModel.findByEmployeeCode(employee_code.trim().toUpperCase());
    if (existingCode.length > 0) {
        throw new Error('Employee code is already in use.');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    const newEmployee = {
        full_name: full_name.trim(),
        username: username.trim(),
        employee_code: employee_code.trim().toUpperCase(),
        position: position ? position.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        password_hash
    };

    const insertId = await userModel.insert(newEmployee);
    return insertId;
};

// ==========================================
// UPDATE EMPLOYEE
// ==========================================
export const updateEmployee = async (id, data) => {
    const { full_name, username, employee_code, position, email, status } = data;

    // Validate required fields
    if (!full_name || !username || !employee_code || !status) {
        throw new Error('full_name, username, employee_code, and status are required.');
    }

    // Validate status value
    if (!['active', 'suspended'].includes(status)) {
        throw new Error('Status must be active or suspended.');
    }

    // Check employee exists
    const existing = await userModel.findById(id);
    if (existing.length === 0) {
        throw new Error('Employee not found.');
    }

    // Check duplicate username — allow same user to keep their own username
    const existingUsername = await userModel.findByUsername(username.trim());
    if (existingUsername.length > 0 && existingUsername[0].id !== Number(id)) {
        throw new Error('Username is already taken.');
    }

    // Check duplicate employee_code — allow same user to keep their own code
    const existingCode = await userModel.findByEmployeeCode(employee_code.trim().toUpperCase());
    if (existingCode.length > 0 && existingCode[0].id !== Number(id)) {
        throw new Error('Employee code is already in use.');
    }

    const updatedEmployee = {
        id: Number(id),
        full_name: full_name.trim(),
        username: username.trim(),
        employee_code: employee_code.trim().toUpperCase(),
        position: position ? position.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        status
    };

    const affectedRows = await userModel.update(updatedEmployee);
    return affectedRows;
};

// ==========================================
// DELETE EMPLOYEE
// ==========================================
export const deleteEmployee = async (id) => {
    const existing = await userModel.findById(id);

    if (existing.length === 0) {
        throw new Error('Employee not found.');
    }

    const affectedRows = await userModel.remove(id);
    return affectedRows;
};

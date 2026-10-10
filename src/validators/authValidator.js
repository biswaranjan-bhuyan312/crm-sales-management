import { body } from "express-validator";

export const registerValidator = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("EMail is required")
        .isEmail()
        .withMessage("Please Enter a valid Email")
        .normalizeEmail(),
    body("phone")
        .trim()
        .notEmpty()
        .withMessage("Phone number is required")
        .matches(/^\+?[0-9]{7,15}$/)
        .withMessage("Enter a valide Phone number"),
    body("password")
        .isString()
        .withMessage("Password must be a string")
        .bail()
        .isLength({min:8})
        .withMessage("Password must be at least 8 characters long")
        .matches(/[a-z]/)
        .withMessage("Password must contain atleast one Lower case letter.")
        .matches(/[A-Z]/)
        .withMessage("Password must contain atleast one Upper case letter.")
        .matches(/[0-9]/)
        .withMessage("Password must contain atleast one number")
        .matches(/[^A-Za-z0-9]/)
        .withMessage("Password must contain one Special character"),
    body("role")
        .trim()
        .notEmpty()
        .withMessage("Role is required")
        .isIn(["Admin","Sales Manager","Sales Executive"])
        .withMessage("Please provide  a valid role.")
];

export const loginValidator = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please enter a valid email address")
        .normalizeEmail(),
    body("password")
        .notEmpty()
        .withMessage("Password is required")
];
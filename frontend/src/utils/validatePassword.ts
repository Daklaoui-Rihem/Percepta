/**
 * Validates a password based on the following criteria:
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one special character
 */
export const validatePassword = (password: string): boolean => {
    if (!password) return false;
    
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    // Special characters: !@#$%^&*(),.?":{}|<>
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasSpecialChar;
};

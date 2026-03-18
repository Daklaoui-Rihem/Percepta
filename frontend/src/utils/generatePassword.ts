/**
 * Generates a random secure password that complies with the policy:
 * - At least 10 characters long (to be extra safe)
 * - Includes uppercase, lowercase, numbers, and special characters
 */
export const generatePassword = (length = 12): string => {
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '!@#$%^&*(),.?":{}|';
    
    const allChars = upperChars + lowerChars + numberChars + specialChars;
    
    let password = '';
    
    // Ensure at least one of each required type
    password += upperChars[Math.floor(Math.random() * upperChars.length)];
    password += lowerChars[Math.floor(Math.random() * lowerChars.length)];
    password += numberChars[Math.floor(Math.random() * numberChars.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
    
    // Fill the rest of the length
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the result
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

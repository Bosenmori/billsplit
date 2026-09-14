import jwt from 'jsonwebtoken';

export function verifyAuth(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return {message: 'ไม่พบtoken', success: false};
    } 

    const token = authHeader.split(' ')[1];
    if (!token) {
        return {message: 'รูปแบบtokenไม่ถูกต้อง', success: false};
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        return {userId: decoded.userId,email: decoded.email, success: true}

    } catch (error) {
        return {message: 'token ไม่ถูกต้องหรือหมดอายุ', success: false, error: error.message}
    }
}
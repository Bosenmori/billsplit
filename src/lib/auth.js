import jwt from 'jsonwebtoken';
export function verifyAuth(request){
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return { success: false, message: 'ไม่พบtoken'}
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
    return { success: false, message: 'รูปแบบ token ไม่ถูกต้อง' };
  }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        return {success: true, userId: decoded.userId, email: decoded.email}
    } catch (error) {
        return { success: false, message: 'token ไม่ถูกต้องหรือหมดอายุ'}
    }

}
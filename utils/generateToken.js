import jwt from "jsonwebtoken";

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
  });
};

export const verify_jwt = (token) => {
  try {
    // tokenTrim = token.split(" ")[1];
    let decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    return { status: true, data: decoded };
  } catch (e) {
    return { status: false, message: e.message };
  }
};

import userModel from "../models/userModel.js";

const getUserName = async (req) => {
  if (req.auth && req.auth.email) {
    const requester = req.auth.email;
    console.log("Requester Email:", requester);
    console.log("body:", req.body);
    const user = await userModel.findOne({ email: requester });
    return user ? user.name : "Anonymous";
  } else {
    return "--";
  }
};
export default getUserName;

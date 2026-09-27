import rateLimit from "express-rate-limit";

export const apiLimiter=rateLimit({
    windowMs:1*60*1000,
    max:100,
    message: "Too many requests, please try again later"
})

export const loginLimiter=rateLimit({
    windowMs:15*60*1000,
    max:5,
    message: "Too many login attempts, try again after 15 minutes",
})
package com.meetclone.controller;

import com.meetclone.entity.User;
import com.meetclone.entity.Meeting;
import com.meetclone.service.UserService;
import com.meetclone.service.MeetingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Controller
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private MeetingService meetingService;

    @GetMapping("/")
    public String loginPage() {
        return "loginpage";
    }

    @GetMapping("/loginpage")
    public String loginPages() {
        return "loginpage";
    }

    @GetMapping("/signup")
    public String signupPage() {
        return "signup";
    }

    @GetMapping("/index")
    public String indexPage(HttpSession session, Model model) {
        Boolean isLoggedIn = (Boolean) session.getAttribute("isLoggedIn");
        if (isLoggedIn == null || !isLoggedIn) {
            return "redirect:/loginpage";
        }

        String email = (String) session.getAttribute("email");
        String username = (String) session.getAttribute("username");
        String role = (String) session.getAttribute("role");

        model.addAttribute("email", email);
        model.addAttribute("username", username);
        model.addAttribute("role", role);
        model.addAttribute("isAdmin", "ADMIN".equals(role));

        return "index";
    }

    @GetMapping("/admin")
    public String adminPage(HttpSession session, Model model) {
        String role = (String) session.getAttribute("role");
        if (role == null || !"ADMIN".equals(role)) {
            model.addAttribute("error", "Access denied. Admin privileges required.");
            return "redirect:/index";
        }

        String username = (String) session.getAttribute("username");
        model.addAttribute("username", username);

        return "admin_dashboard";
    }

    @GetMapping("/forgot")
    public String forgotPasswordPage() {
        return "forgot_password";
    }

    @GetMapping("/verify-otp")
    public String verifyOtpPage(HttpSession session, Model model) {
        String resetEmail = (String) session.getAttribute("resetEmail");
        if (resetEmail == null) {
            return "redirect:/forgot";
        }
        return "verify_otp";
    }

    @GetMapping("/lobby")
    public String lobbyPage(HttpSession session, Model model) {
        String username = (String) session.getAttribute("username");
        Long userId = (Long) session.getAttribute("userId");
        String meetingCode = (String) session.getAttribute("meetingCode");
        String meetingTitle = (String) session.getAttribute("meetingTitle");
        Boolean isHost = (Boolean) session.getAttribute("isHost");

        if (username == null || userId == null) {
            return "redirect:/loginpage";
        }

        if (meetingCode == null) {
            return "redirect:/index";
        }

        model.addAttribute("username", username);
        model.addAttribute("userId", userId);
        model.addAttribute("meetingCode", meetingCode);
        model.addAttribute("meetingTitle", meetingTitle != null ? meetingTitle : "Meeting");
        model.addAttribute("isHost", isHost != null ? isHost : false);

        return "lobby";
    }

    @GetMapping("/meeting")
    public String meeting(HttpSession session, Model model) {
        String username = (String) session.getAttribute("username");
        Long userId = (Long) session.getAttribute("userId");
        String meetingCode = (String) session.getAttribute("meetingCode");
        String meetingTitle = (String) session.getAttribute("meetingTitle");
        Boolean isHost = (Boolean) session.getAttribute("isHost");

        if (username == null || userId == null) {
            return "redirect:/loginpage";
        }

        if (meetingCode == null) {
            return "redirect:/index";
        }

        model.addAttribute("username", username);
        model.addAttribute("userId", userId);
        model.addAttribute("meetingCode", meetingCode);
        model.addAttribute("meetingTitle", meetingTitle != null ? meetingTitle : "Meeting");
        model.addAttribute("isHost", isHost != null ? isHost : false);

        return "meeting";
    }

    @PostMapping("/signup")
    public String register(User user, Model model) {
        try {
            user.setEmail(userService.sanitizeInput(user.getEmail()));
            user.setUsername(userService.sanitizeInput(user.getUsername()));
            user.setFullName(userService.sanitizeInput(user.getFullName()));

            if (!userService.isValidEmail(user.getEmail())) {
                model.addAttribute("error", "Invalid email format. Please enter a valid email address.");
                return "signup";
            }

            if (userService.emailExists(user.getEmail())) {
                model.addAttribute("error", "Email already registered. Please sign in or use a different email.");
                return "signup";
            }

            if (!userService.isValidUsername(user.getUsername())) {
                model.addAttribute("error",
                        "Invalid username. Must be 3-20 characters, start with a letter, and contain only letters, numbers, and underscores.");
                return "signup";
            }

            if (userService.usernameExists(user.getUsername())) {
                model.addAttribute("error", "Username already taken. Please choose a different username.");
                return "signup";
            }

            if (!userService.isValidPassword(user.getPassword())) {
                model.addAttribute("error",
                        "Password must be at least 8 characters and contain uppercase, lowercase, and numbers.");
                return "signup";
            }

            user.setRole("USER");
            user.setIsActive(true);

            userService.createUser(user);

            model.addAttribute("success", "Account created successfully! Please log in.");
            return "loginpage";

        } catch (Exception e) {
            model.addAttribute("error", "Registration failed. Please try again.");
            return "signup";
        }
    }

    @PostMapping("/loginpage")
    public String login(@RequestParam String email,
            @RequestParam String password,
            HttpSession session,
            Model model) {
        try {
            email = userService.sanitizeInput(email);

            if (!userService.isValidEmail(email)) {
                model.addAttribute("error", "Invalid email format.");
                return "loginpage";
            }

            Optional<User> userOpt = userService.getUserByEmail(email);

            if (userOpt.isPresent()) {
                User user = userOpt.get();

                if (!user.getIsActive()) {
                    model.addAttribute("error", "Account is deactivated. Please contact support.");
                    return "loginpage";
                }

                if (userService.verifyPassword(password, user.getPassword())) {
                    userService.updateLastLogin(user.getId());

                    session.setAttribute("username", user.getUsername());
                    session.setAttribute("userId", user.getId());
                    session.setAttribute("email", user.getEmail());
                    session.setAttribute("role", user.getRole());
                    session.setAttribute("isLoggedIn", true);
                    session.setAttribute("fullName", user.getFullName());

                    if ("ADMIN".equals(user.getRole())) {
                        return "redirect:/admin";
                    } else {
                        return "redirect:/index";
                    }
                } else {
                    model.addAttribute("error", "Invalid password. Please try again.");
                }
            } else {
                model.addAttribute("error", "Email not found. Please sign up first.");
            }
        } catch (Exception e) {
            model.addAttribute("error", "Login failed. Please try again.");
        }

        return "loginpage";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/loginpage";
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestParam String email,
            HttpSession session,
            Model model) {
        try {
            email = userService.sanitizeInput(email);

            if (!userService.isValidEmail(email)) {
                model.addAttribute("error", "Invalid email format.");
                return "forgot_password";
            }

            Optional<User> userOpt = userService.getUserByEmail(email);
            if (userOpt.isPresent()) {
                String otp = userService.generateOtp();

                session.setAttribute("resetEmail", email);
                session.setAttribute("resetOtp", otp);
                session.setAttribute("otpTimestamp", LocalDateTime.now());

                userService.sendOtpEmail(email, otp);

                model.addAttribute("success", "OTP sent to your email. Check your inbox.");
                return "redirect:/verify-otp";
            } else {
                model.addAttribute("error", "Email not registered.");
                return "forgot_password";
            }
        } catch (Exception e) {
            model.addAttribute("error", "Failed to send OTP. Please try again.");
            return "forgot_password";
        }
    }

    @PostMapping("/verify-otp")
    public String verifyOtp(@RequestParam String otp,
            HttpSession session,
            Model model) {
        try {
            String savedOtp = (String) session.getAttribute("resetOtp");
            String resetEmail = (String) session.getAttribute("resetEmail");
            LocalDateTime otpTimestamp = (LocalDateTime) session.getAttribute("otpTimestamp");

            if (savedOtp == null || resetEmail == null || otpTimestamp == null) {
                model.addAttribute("error", "Session expired. Please request a new OTP.");
                return "redirect:/forgot";
            }

            long minutesElapsed = ChronoUnit.MINUTES.between(otpTimestamp, LocalDateTime.now());
            if (minutesElapsed > 5) {
                session.removeAttribute("resetOtp");
                session.removeAttribute("otpTimestamp");
                model.addAttribute("error", "OTP expired. Please request a new one.");
                return "redirect:/forgot";
            }

            if (!userService.isValidOtp(otp)) {
                model.addAttribute("error", "Invalid OTP format. Must be 6 digits.");
                return "verify_otp";
            }

            if (userService.verifyOtp(otp, savedOtp)) {
                session.removeAttribute("resetOtp");
                session.removeAttribute("otpTimestamp");

                model.addAttribute("email", resetEmail);
                model.addAttribute("success", "OTP verified! You can now reset your password.");
                return "reset_password";
            } else {
                model.addAttribute("error", "Invalid OTP. Please try again.");
                return "verify_otp";
            }
        } catch (Exception e) {
            model.addAttribute("error", "Verification failed. Please try again.");
            return "verify_otp";
        }
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestParam String email,
            @RequestParam String newPassword,
            HttpSession session,
            Model model) {
        try {
            String resetEmail = (String) session.getAttribute("resetEmail");
            if (resetEmail == null || !resetEmail.equals(email)) {
                model.addAttribute("error", "Invalid session. Please start over.");
                return "redirect:/forgot";
            }

            if (!userService.isValidPassword(newPassword)) {
                model.addAttribute("error",
                        "Password must be at least 8 characters and contain uppercase, lowercase, and numbers.");
                model.addAttribute("email", email);
                return "reset_password";
            }

            Optional<User> userOpt = userService.getUserByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setPassword(newPassword);
                userService.createUser(user);

                session.removeAttribute("resetEmail");

                model.addAttribute("success", "Password reset successfully! Please log in.");
                return "redirect:/loginpage";
            } else {
                model.addAttribute("error", "User not found.");
                return "redirect:/loginpage";
            }
        } catch (Exception e) {
            model.addAttribute("error", "Password reset failed. Please try again.");
            model.addAttribute("email", email);
            return "reset_password";
        }
    }

    @PostMapping("/joinMeeting")
    public String joinMeeting(@RequestParam String yourName,
            @RequestParam String meetingCode,
            HttpSession session,
            Model model) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            if (userId == null) {
                return "redirect:/loginpage";
            }

            yourName = userService.sanitizeInput(yourName);
            meetingCode = userService.sanitizeInput(meetingCode);

            Optional<Meeting> meetingOpt = meetingService.getMeetingByCode(meetingCode);

            if (meetingOpt.isPresent()) {
                Meeting meeting = meetingOpt.get();

                if (!meeting.getIsActive()) {
                    model.addAttribute("error", "This meeting has ended.");
                    return "index";
                }

                session.setAttribute("meetingTitle", yourName);
                session.setAttribute("meetingCode", meetingCode);
                session.setAttribute("meetingId", meeting.getId());
                session.setAttribute("isHost", false);

                return "redirect:/lobby";
            } else {
                model.addAttribute("error", "Invalid meeting code. Please check and try again.");
                return "index";
            }
        } catch (Exception e) {
            model.addAttribute("error", "Failed to join meeting. Please try again.");
            return "index";
        }
    }

    @PostMapping("/startMeeting")
    public String startMeeting(@RequestParam String meetingName,
            HttpSession session,
            Model model) {
        try {
            Long userId = (Long) session.getAttribute("userId");
            String username = (String) session.getAttribute("username");

            if (userId == null || username == null) {
                return "redirect:/loginpage";
            }

            meetingName = userService.sanitizeInput(meetingName);

            String meetingCode = generateMeetingCode(userId);

            Meeting meeting = meetingService.createMeeting(meetingName, meetingCode, userId);

            session.setAttribute("meetingCode", meetingCode);
            session.setAttribute("meetingId", meeting.getId());
            session.setAttribute("meetingTitle", meetingName);
            session.setAttribute("isHost", true);

            return "redirect:/lobby";
        } catch (Exception e) {
            model.addAttribute("error", "Failed to start meeting. Please try again.");
            return "index";
        }
    }

    private String generateMeetingCode(Long userId) {
        String timestamp = Long.toHexString(System.currentTimeMillis()).toUpperCase();
        return userId.toString() + "-" + timestamp;
    }
}
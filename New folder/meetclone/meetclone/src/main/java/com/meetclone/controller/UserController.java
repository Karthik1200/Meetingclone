package com.meetclone.controller;

import com.meetclone.entity.User;
import com.meetclone.entity.Admin;
import com.meetclone.entity.Meeting;
import com.meetclone.entity.PasswordResetToken;
import com.meetclone.service.UserService;
import com.meetclone.service.MeetingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;

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
    public String loginPages(@RequestParam(required = false) String error,
            @RequestParam(required = false) String logout,
            Model model) {
        if (error != null) {
            model.addAttribute("error", "Invalid email or password. Please try again.");
        }
        if (logout != null) {
            model.addAttribute("success", "You have been logged out successfully.");
        }
        return "loginpage";
    }

    @GetMapping("/signup")
    public String signupPage() {
        return "signup";
    }

    @GetMapping("/index")
    public String indexPage(@RequestParam(required = false) String join, HttpSession session, Model model) {
        Boolean isLoggedIn = (Boolean) session.getAttribute("isLoggedIn");
        if (isLoggedIn == null || !isLoggedIn) {
            if (join != null) {
                session.setAttribute("onLoginRedirect", "/index?join=" + join);
            }
            return "redirect:/loginpage";
        }

        String email = (String) session.getAttribute("email");
        String username = (String) session.getAttribute("username");
        String role = (String) session.getAttribute("role");

        model.addAttribute("email", email);
        model.addAttribute("username", username);
        model.addAttribute("role", role);
        model.addAttribute("isAdmin", "ADMIN".equals(role));
        if (join != null) {
            model.addAttribute("joinCode", join);
        }

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

    
    @GetMapping("/reset-password")
    public String resetPasswordPage(@RequestParam(required = false) String token, Model model) {
        if (token == null || token.trim().isEmpty()) {
            model.addAttribute("error", "Invalid reset link. Please request a new one.");
            return "forgot_password";
        }

        Optional<PasswordResetToken> tokenOpt = userService.validatePasswordResetToken(token);

        if (tokenOpt.isEmpty()) {
            model.addAttribute("error", "This reset link is invalid or has expired. Please request a new one.");
            return "forgot_password";
        }

        model.addAttribute("token", token);
        return "reset_password";
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
    public String register(@RequestParam String username,
            @RequestParam String fullName,
            @RequestParam String email,
            @RequestParam String password,
            @RequestParam(defaultValue = "USER") String role,
            Model model) {
        try {
            email = userService.sanitizeInput(email);
            username = userService.sanitizeInput(username);
            fullName = userService.sanitizeInput(fullName);

            if (!userService.isValidEmail(email)) {
                model.addAttribute("error", "Invalid email format. Please enter a valid email address.");
                return "signup";
            }

            if (!userService.isValidUsername(username)) {
                model.addAttribute("error",
                        "Invalid username. Must be 3-20 characters, start with a letter, and contain only letters, numbers, and underscores.");
                return "signup";
            }

            if (!userService.isValidPassword(password)) {
                model.addAttribute("error",
                        "Password must be at least 8 characters and contain uppercase, lowercase, and numbers.");
                return "signup";
            }

            if (userService.passwordExists(password)) {
                model.addAttribute("error", "Password already exists for another user. Please give a new Password.");
                return "signup";
            }

            System.out.println("===========================================");
            System.out.println("SIGNUP - Role received: [" + role + "]");
            System.out.println("Role equals ADMIN: " + "ADMIN".equalsIgnoreCase(role));
            System.out.println("===========================================");

            if ("ADMIN".equalsIgnoreCase(role)) {

                if (userService.adminEmailExists(email)) {
                    model.addAttribute("error",
                            "Email already registered as admin. Please sign in or use a different email.");
                    return "signup";
                }

                if (userService.adminUsernameExists(username)) {
                    model.addAttribute("error", "Username already taken. Please choose a different username.");
                    return "signup";
                }

                Admin admin = new Admin();
                admin.setEmail(email.trim().toLowerCase());
                admin.setUsername(username);
                admin.setFullName(fullName);
                admin.setPassword(password);
                admin.setRole("ADMIN");
                admin.setIsActive(true);

                userService.createAdmin(admin);

                model.addAttribute("success", "Admin account created successfully! Please log in.");
                return "loginpage";

            } else {

                if (userService.emailExists(email)) {
                    model.addAttribute("error", "Email already registered. Please sign in or use a different email.");
                    return "signup";
                }

                if (userService.usernameExists(username)) {
                    model.addAttribute("error", "Username already taken. Please choose a different username.");
                    return "signup";
                }

                User user = new User();
                user.setEmail(email.trim().toLowerCase());
                user.setUsername(username);
                user.setFullName(fullName);
                user.setPassword(password);
                user.setRole("USER");
                user.setIsActive(true);

                userService.createUser(user);

                model.addAttribute("success", "Account created successfully! Please log in.");
                return "loginpage";
            }

        } catch (Exception e) {
            model.addAttribute("error", "Registration failed. Please try again.");
            return "signup";
        }
    }

    @PostMapping("/api/auth/google")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> googleSignIn(
            @RequestBody Map<String, String> payload,
            HttpSession session) {

        Map<String, Object> response = new HashMap<>();

        try {
            String email = payload.get("email");
            String name = payload.get("name");
            String googleId = payload.get("googleId");
            String imageUrl = payload.get("imageUrl");

            if (email == null || googleId == null) {
                response.put("success", false);
                response.put("message", "Invalid Google credentials");
                return ResponseEntity.badRequest().body(response);
            }

            Optional<User> existingGoogleUser = userService.findByProviderAndProviderId("GOOGLE", googleId);

            User user;
            if (existingGoogleUser.isPresent()) {
                user = existingGoogleUser.get();
            } else {
                Optional<User> existingEmailUser = userService.getUserByEmail(email);

                if (existingEmailUser.isPresent()) {
                    User existingUser = existingEmailUser.get();
                    if ("LOCAL".equals(existingUser.getAuthProvider())) {
                        existingUser.setAuthProvider("GOOGLE");
                        existingUser.setProviderId(googleId);
                        if (imageUrl != null) {
                            existingUser.setProfileImageUrl(imageUrl);
                        }
                        user = userService.createUser(existingUser);
                    } else {
                        user = existingUser;
                    }
                } else {
                    user = new User();
                    user.setEmail(email.toLowerCase().trim());
                    user.setFullName(name != null ? name : "Google User");
                    user.setUsername(generateUsernameFromEmail(email));
                    user.setPassword(UUID.randomUUID().toString());
                    user.setAuthProvider("GOOGLE");
                    user.setProviderId(googleId);
                    user.setProfileImageUrl(imageUrl);
                    user.setRole("USER");
                    user.setIsActive(true);

                    user = userService.createUser(user);
                }
            }

            userService.updateLastLogin(user.getId());

            session.setAttribute("username", user.getUsername());
            session.setAttribute("userId", user.getId());
            session.setAttribute("email", user.getEmail());
            session.setAttribute("role", user.getRole());
            session.setAttribute("isLoggedIn", true);
            session.setAttribute("fullName", user.getFullName());

            String redirectUrl = (String) session.getAttribute("onLoginRedirect");
            if (redirectUrl != null) {
                session.removeAttribute("onLoginRedirect");
                response.put("redirectUrl", redirectUrl);
            } else {
                response.put("redirectUrl", "ADMIN".equals(user.getRole()) ? "/admin" : "/index");
            }

            response.put("success", true);
            response.put("message", "Login successful");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Google sign-in failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    private String generateUsernameFromEmail(String email) {
        String baseName = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "");
        if (baseName.length() < 3) {
            baseName = baseName + "user";
        }
        if (baseName.length() > 15) {
            baseName = baseName.substring(0, 15);
        }

        String username = baseName;
        int counter = 1;
        while (userService.usernameExists(username)) {
            username = baseName + counter;
            counter++;
        }
        return username;
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

                    String redirectUrl = (String) session.getAttribute("onLoginRedirect");
                    if (redirectUrl != null) {
                        session.removeAttribute("onLoginRedirect");
                        return "redirect:" + redirectUrl;
                    }

                    return "redirect:/index";
                } else {
                    model.addAttribute("error", "Invalid password. Please try again.");
                    return "loginpage";
                }
            }

            Optional<Admin> adminOpt = userService.getAdminByEmail(email);

            if (adminOpt.isPresent()) {
                Admin admin = adminOpt.get();

                if (!admin.getIsActive()) {
                    model.addAttribute("error", "Account is deactivated. Please contact support.");
                    return "loginpage";
                }

                if (userService.verifyPassword(password, admin.getPassword())) {
                    userService.updateAdminLastLogin(admin.getId());

                    session.setAttribute("username", admin.getUsername());
                    session.setAttribute("userId", admin.getId());
                    session.setAttribute("email", admin.getEmail());
                    session.setAttribute("role", admin.getRole());
                    session.setAttribute("isLoggedIn", true);
                    session.setAttribute("fullName", admin.getFullName());
                    session.setAttribute("isAdmin", true);

                    String redirectUrl = (String) session.getAttribute("onLoginRedirect");
                    if (redirectUrl != null) {
                        session.removeAttribute("onLoginRedirect");
                        return "redirect:" + redirectUrl;
                    }

                    return "redirect:/admin";
                } else {
                    model.addAttribute("error", "Invalid password. Please try again.");
                    return "loginpage";
                }
            }

            model.addAttribute("error", "Email not found. Please sign up first.");

        } catch (Exception e) {
            model.addAttribute("error", "Login failed. Please try again.");
        }

        return "loginpage";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/loginpage?logout=true";
    }


    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestParam String email,
            Model model) {
        try {
            email = userService.sanitizeInput(email);

            if (!userService.isValidEmail(email)) {
                model.addAttribute("error", "Invalid email format.");
                return "forgot_password";
            }

            Optional<User> userOpt = userService.getUserByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();

                userService.createPasswordResetToken(user);

                model.addAttribute("success",
                        "A password reset link has been sent to your email address. Please check your inbox (and spam folder).");
                return "forgot_password";
            } else {
                
                model.addAttribute("success",
                        "If an account exists with that email, a password reset link has been sent. Please check your inbox.");
                return "forgot_password";
            }
        } catch (Exception e) {
            model.addAttribute("error", "Failed to process your request. Please try again.");
            return "forgot_password";
        }
    }

    
    @PostMapping("/reset-password")
    public String resetPassword(@RequestParam String token,
            @RequestParam String newPassword,
            Model model) {
        try {
            if (token == null || token.trim().isEmpty()) {
                model.addAttribute("error", "Invalid reset token. Please request a new reset link.");
                return "forgot_password";
            }

            if (!userService.isValidPassword(newPassword)) {
                model.addAttribute("error",
                        "Password must be at least 8 characters and contain uppercase, lowercase, and numbers.");
                model.addAttribute("token", token);
                return "reset_password";
            }

            boolean success = userService.resetPasswordWithToken(token, newPassword);

            if (success) {
                model.addAttribute("success", "Password reset successfully! Please log in with your new password.");
                return "loginpage";
            } else {
                model.addAttribute("error", "This reset link is invalid or has expired. Please request a new one.");
                return "forgot_password";
            }
        } catch (Exception e) {
            model.addAttribute("error", "Password reset failed. Please try again.");
            model.addAttribute("token", token);
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
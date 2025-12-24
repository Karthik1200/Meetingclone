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
import java.util.Optional;

@Controller
public class UserController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private MeetingService meetingService;

    // Pages
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
        String email = (String) session.getAttribute("email");
        if (email != null) {
            model.addAttribute("email", email);
        }
        return "index";
    }
    @GetMapping("/meeting")
    public String meeting(HttpSession session, Model model) {
        String username = (String) session.getAttribute("username");
        Long userId = (Long) session.getAttribute("userId");
        String meetingCode = (String) session.getAttribute("meetingCode");
        String meetingTitle = (String) session.getAttribute("meetingTitle");
        
        // Check if user is logged in
        if (username == null || userId == null) {
            return "redirect:/loginpage";
        }
        
        // Check if user has a valid meeting code in session
        if (meetingCode == null) {
            return "redirect:/index";
        }
        
        model.addAttribute("username", username);
        model.addAttribute("userId", userId);
        model.addAttribute("meetingCode", meetingCode);
        model.addAttribute("meetingTitle", meetingTitle != null ? meetingTitle : "Meeting");
        return "meeting";
    }
    
    private String generateMeetingCode(Long userId) {
        String timestamp = Long.toHexString(System.currentTimeMillis()).toUpperCase();
        return userId.toString() + "-" + timestamp;
    }

    // Signup (HTML FORM)
    @PostMapping("/signup")
    public String register(User user) {

        if (userService.emailExists(user.getEmail())) {
            return "signup";
        }

        if (userService.usernameExists(user.getUsername())) {
            return "signup";
        }

        userService.createUser(user);
        return "loginpage";
    }

@PostMapping("/loginpage")
public String login(@RequestParam String email,
                    @RequestParam String password,
                    HttpSession session,
                    Model model) {

    Optional<User> userOpt = userService.getUserByEmail(email);

    if (userOpt.isPresent()) {
        User user = userOpt.get();

        if (userService.verifyPassword(password, user.getPassword())) {
            userService.updateLastLogin(user.getId());
            session.setAttribute("username", user.getUsername());
            session.setAttribute("userId", user.getId());
            session.setAttribute("isLoggedIn", true);
            return "redirect:/index";
        } else {
            model.addAttribute("error", "Invalid password");
        }
    } else {
        model.addAttribute("error", "Email not found. Please sign up first.");
    }
    return "loginpage";
}

// Join Meeting
@PostMapping("/joinMeeting")
public String joinMeeting(@RequestParam String yourName,
                          @RequestParam String meetingCode,
                          HttpSession session,
                          Model model) {
    
    // Check if user is logged in
    // Long userId = (Long) session.getAttribute("userId");
    // if (userId == null) {
    //     return "redirect:/loginpage";
    // }
    
    // Check if meeting exists
    Optional<Meeting> meetingOpt = meetingService.getMeetingByCode(meetingCode);
    
    if (meetingOpt.isPresent()) {
        Meeting meeting = meetingOpt.get();
        // Save the participant information (yourName = title, meetingCode already in DB)
        session.setAttribute("meetingTitle", yourName);
        session.setAttribute("meetingCode", meetingCode);
        session.setAttribute("meetingId", meeting.getId());
        session.setAttribute("isHost", false);
        return "redirect:/meeting";
    } else {
        model.addAttribute("error", "Invalid meeting code. Please check and try again.");
        return "/meeting";
    }
}

// Start New Meeting (POST from modal)
@PostMapping("/startMeeting")
public String startMeeting(@RequestParam String meetingName,
                           HttpSession session,
                           Model model) {
    
    // Check if user is logged in
    Long userId = (Long) session.getAttribute("userId");
    String username = (String) session.getAttribute("username");
    
    if (userId == null || username == null) {
        return "redirect:/loginpage";
    }
    
    // Generate meeting code
    String meetingCode = generateMeetingCode(userId);
    
    // Create and save meeting to database
    Meeting meeting = meetingService.createMeeting(meetingName, meetingCode, userId);
    
    // Store in session
    session.setAttribute("meetingCode", meetingCode);
    session.setAttribute("meetingId", meeting.getId());
    session.setAttribute("meetingTitle", meetingName);
    session.setAttribute("isHost", true);
    
    return "redirect:/meeting";
}

}

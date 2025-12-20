package com.meetclone.controller;

import com.meetclone.entity.User;
import com.meetclone.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@Controller
public class UserController {

    @Autowired
    private UserService userService;

    // Pages
    @GetMapping("/")
    public String loginPage() {
        return "loginpage";
    }

    @GetMapping("/signup")
    public String signupPage() {
        return "signup";
    }

    @GetMapping("/index")
    public String indexPage() {
        return "index";
    }
    @GetMapping("/meeting")
    public String meeting() {
        return "meeting";
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
                    @RequestParam String password) {

    Optional<User> userOpt = userService.getUserByEmail(email);

    if (userOpt.isPresent()) {
        User user = userOpt.get();

        if (userService.verifyPassword(password, user.getPassword())) {
            userService.updateLastLogin(user.getId());
            return "redirect:/index";
        }
    }
    return "index";
}


}

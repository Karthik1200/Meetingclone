package com.meetclone.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class UserController {
    @GetMapping("/index")
    public String landing(){
       return "index";
    }

    @GetMapping("/meeting")
    public String meeting(){
        return "meeting";
    }

    @GetMapping("/")
    public String loginpage() {
        return "login";
    }
    
    @GetMapping("/signup")
    public String signuppage(){
        return "signup";
    }
}

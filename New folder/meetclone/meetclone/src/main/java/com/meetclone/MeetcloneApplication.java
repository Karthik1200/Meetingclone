package com.meetclone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.meetclone.controller", "com.meetclone.service", "com.meetclone.repository", "com.meetclone.config"})
public class MeetcloneApplication {

	public static void main(String[] args) {
		SpringApplication.run(MeetcloneApplication.class, args);
	}

}

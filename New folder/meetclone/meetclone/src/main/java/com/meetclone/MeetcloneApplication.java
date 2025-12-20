package com.meetclone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.meetclone.controller"})
public class MeetcloneApplication {

	public static void main(String[] args) {
		SpringApplication.run(MeetcloneApplication.class, args);
	}

}

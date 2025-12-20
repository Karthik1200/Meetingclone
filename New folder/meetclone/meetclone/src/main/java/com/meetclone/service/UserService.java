package com.meetclone.service;

import com.meetclone.entity.User;
import com.meetclone.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository repo;

    public boolean emailExists(String email) {
        return repo.existsByEmail(email);
    }

    public boolean usernameExists(String username) {
        return repo.existsByUsername(username);
    }

    public User createUser(User user) {
        return repo.save(user);
    }

    public Optional<User> getUserByEmail(String email) {
        return repo.findByEmail(email);
    }

    public boolean verifyPassword(String raw, String saved) {
        return raw.equals(saved); // plain text (for learning)
    }
    

    public void updateLastLogin(Long id) {
        repo.findById(id).ifPresent(user -> {
            user.setLastLogin(LocalDateTime.now());
            repo.save(user);
        });
    }
}

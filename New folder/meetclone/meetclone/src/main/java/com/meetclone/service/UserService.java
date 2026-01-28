package com.meetclone.service;

import com.meetclone.entity.User;
import com.meetclone.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;
import java.util.regex.Pattern;

@Service
public class UserService {

    @Autowired
    private UserRepository repo;

    private static final String EMAIL_REGEX = "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$";

    private static final Pattern EMAIL_PATTERN = Pattern.compile(EMAIL_REGEX);

    public boolean emailExists(String email) {
        return repo.existsByEmail(email);
    }

    public boolean usernameExists(String username) {
        return repo.existsByUsername(username);
    }

    public boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }

        email = email.trim().toLowerCase();

        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return false;
        }

        if (email.length() > 254) {
            return false;
        }

        String[] parts = email.split("@");
        if (parts.length != 2) {
            return false;
        }

        String localPart = parts[0];
        if (localPart.length() > 64) {
            return false;
        }

        String domain = parts[1];
        if (domain.length() > 255) {
            return false;
        }

        String[] disposableDomains = { "tempmail.com", "throwaway.email", "guerrillamail.com" };
        for (String disposable : disposableDomains) {
            if (domain.equalsIgnoreCase(disposable)) {
                return false;
            }
        }

        return true;
    }

    public boolean isValidPassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }

        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;

        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c))
                hasUpper = true;
            if (Character.isLowerCase(c))
                hasLower = true;
            if (Character.isDigit(c))
                hasDigit = true;
        }

        return hasUpper && hasLower && hasDigit;
    }

    public User createUser(User user) {
        return repo.save(user);
    }

    public Optional<User> getUserByEmail(String email) {
        return repo.findByEmail(email.trim().toLowerCase());
    }

    public Optional<User> getUserById(Long id) {
        return repo.findById(id);
    }

    public boolean verifyPassword(String rawPassword, String savedPassword) {
        return rawPassword != null && rawPassword.equals(savedPassword);
    }

    public void updateLastLogin(Long id) {
        repo.findById(id).ifPresent(user -> {
            user.setLastLogin(LocalDateTime.now());
            repo.save(user);
        });
    }

    public String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    public boolean isValidOtp(String otp) {
        if (otp == null || otp.length() != 6) {
            return false;
        }

        return otp.matches("\\d{6}");
    }

    public boolean verifyOtp(String inputOtp, String savedOtp) {
        if (inputOtp == null || savedOtp == null) {
            return false;
        }

        return inputOtp.trim().equals(savedOtp.trim());
    }

    public boolean isAdmin(User user) {
        return user != null && "ADMIN".equalsIgnoreCase(user.getRole());
    }

    public boolean isUser(User user) {
        return user != null && "USER".equalsIgnoreCase(user.getRole());
    }

    public void sendOtpEmail(String email, String otp) {
        System.out.println("===========================================");
        System.out.println("SENDING OTP EMAIL");
        System.out.println("To: " + email);
        System.out.println("OTP: " + otp);
        System.out.println("===========================================");

    }

    public boolean isValidUsername(String username) {
        if (username == null || username.length() < 3 || username.length() > 20) {
            return false;
        }

        return username.matches("^[a-zA-Z][a-zA-Z0-9_]*$");
    }

    public String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }

        return input.trim()
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll("\"", "&quot;")
                .replaceAll("'", "&#x27;")
                .replaceAll("/", "&#x2F;");
    }
}

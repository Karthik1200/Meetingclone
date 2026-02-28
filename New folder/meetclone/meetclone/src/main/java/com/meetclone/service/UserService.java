package com.meetclone.service;

import com.meetclone.entity.User;
import com.meetclone.entity.Admin;
import com.meetclone.entity.PasswordResetToken;
import com.meetclone.repository.UserRepository;
import com.meetclone.repository.AdminRepository;
import com.meetclone.repository.PasswordResetTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class UserService {

    @Autowired
    private UserRepository repo;

    @Autowired
    private AdminRepository adminRepo;

    @Autowired
    private PasswordResetTokenRepository tokenRepo;

    @Autowired
    private EmailService emailService;

    private static final String EMAIL_REGEX = "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$";

    private static final Pattern EMAIL_PATTERN = Pattern.compile(EMAIL_REGEX);

    private static final int TOKEN_EXPIRY_MINUTES = 15;

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

    public Optional<User> findByProviderAndProviderId(String provider, String providerId) {
        return repo.findByAuthProviderAndProviderId(provider, providerId);
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

    // ==========================================
    // Token-Based Password Reset Methods
    // ==========================================

    /**
     * Creates a unique UUID token, stores it in the DB with a 15-minute expiry,
     * and sends a password reset email with a direct link.
     */
    @Transactional
    public String createPasswordResetToken(User user) {
        // Invalidate any existing unused tokens for this user
        List<PasswordResetToken> existingTokens = tokenRepo.findByUserAndUsedFalse(user);
        for (PasswordResetToken existing : existingTokens) {
            existing.setUsed(true);
            tokenRepo.save(existing);
        }

        // Generate a new unique token
        String tokenValue = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(TOKEN_EXPIRY_MINUTES);

        PasswordResetToken resetToken = new PasswordResetToken(tokenValue, user, expiryDate);
        tokenRepo.save(resetToken);

        // Send the reset email
        emailService.sendPasswordResetEmail(user.getEmail(), tokenValue);

        return tokenValue;
    }

    /**
     * Validates a password reset token: checks existence, expiry, and used status.
     * Returns the PasswordResetToken if valid, or empty Optional if invalid.
     */
    public Optional<PasswordResetToken> validatePasswordResetToken(String token) {
        Optional<PasswordResetToken> tokenOpt = tokenRepo.findByToken(token);

        if (tokenOpt.isEmpty()) {
            return Optional.empty();
        }

        PasswordResetToken resetToken = tokenOpt.get();

        if (!resetToken.isValid()) {
            return Optional.empty();
        }

        return Optional.of(resetToken);
    }

    /**
     * Resets the user's password using the provided token.
     * The token is invalidated (marked as used) after successful reset.
     */
    @Transactional
    public boolean resetPasswordWithToken(String token, String newPassword) {
        Optional<PasswordResetToken> tokenOpt = validatePasswordResetToken(token);

        if (tokenOpt.isEmpty()) {
            return false;
        }

        PasswordResetToken resetToken = tokenOpt.get();
        User user = resetToken.getUser();

        // Update the user's password
        user.setPassword(newPassword);
        repo.save(user);

        // Invalidate the token (mark as used)
        resetToken.setUsed(true);
        tokenRepo.save(resetToken);

        return true;
    }

    // ==========================================
    // Existing helper methods
    // ==========================================

    public boolean isAdmin(User user) {
        return user != null && "ADMIN".equalsIgnoreCase(user.getRole());
    }

    public boolean isUser(User user) {
        return user != null && "USER".equalsIgnoreCase(user.getRole());
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

    public boolean passwordExistsInUsers(String password) {
        return repo.existsByPassword(password);
    }

    public boolean passwordExistsInAdmins(String password) {
        return adminRepo.existsByPassword(password);
    }

    public boolean passwordExists(String password) {
        return passwordExistsInUsers(password) || passwordExistsInAdmins(password);
    }

    public boolean adminEmailExists(String email) {
        return adminRepo.existsByEmail(email);
    }

    public boolean adminUsernameExists(String username) {
        return adminRepo.existsByUsername(username);
    }

    public Admin createAdmin(Admin admin) {
        return adminRepo.save(admin);
    }

    public Optional<Admin> getAdminByEmail(String email) {
        return adminRepo.findByEmail(email.trim().toLowerCase());
    }

    public Optional<Admin> getAdminById(Long id) {
        return adminRepo.findById(id);
    }

    public void updateAdminLastLogin(Long id) {
        adminRepo.findById(id).ifPresent(admin -> {
            admin.setLastLogin(LocalDateTime.now());
            adminRepo.save(admin);
        });
    }
}

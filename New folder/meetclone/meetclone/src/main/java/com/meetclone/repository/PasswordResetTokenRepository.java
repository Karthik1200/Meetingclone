package com.meetclone.repository;

import com.meetclone.entity.PasswordResetToken;
import com.meetclone.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    List<PasswordResetToken> findByUserAndUsedFalse(User user);

    void deleteByUser(User user);
}

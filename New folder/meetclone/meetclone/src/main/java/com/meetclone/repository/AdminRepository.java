package com.meetclone.repository;

import com.meetclone.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Long> {

    Optional<Admin> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByPassword(String password);

    Optional<Admin> findByAuthProviderAndProviderId(String authProvider, String providerId);
}

// backend/src/main/java/com/atsmatcher/dto/StudentProfileRequest.java
package com.atsmatcher.dto;

import java.math.BigDecimal;

public class StudentProfileRequest {
    private String branch;
    private BigDecimal cgpa;

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }
    public BigDecimal getCgpa() { return cgpa; }
    public void setCgpa(BigDecimal cgpa) { this.cgpa = cgpa; }
}

import { AbstractAggregate } from "./aggregate";

type GenderType = "Male" | "Female" | "Unknow";
class UserAggregate extends AbstractAggregate {
  Nickname: string;
  Age: number;
  Gender: GenderType;
  CreateTime: Date;

  constructor(nickname: string, age: number = 0) {
    super();
    this.Nickname = nickname;
    this.Age = age;
    this.Gender = "Unknow";
    this.CreateTime = new Date();
    this.Apply({
      Nickname: nickname,
      Age: age,
      Gender: this.Gender,
      CreateTime: this.CreateTime,
    });
  }

  setNickname(newNickname: string) {
    if (newNickname == "") {
      return;
    }
    this.Nickname = newNickname;
    this.Apply({ Nickname: newNickname });
  }

  setAge(newAge: number) {
    if (newAge <= 0) {
      return;
    }
    this.Age = newAge;
    this.Apply({ Age: newAge });
  }

  setGender(newGender: GenderType) {
    this.Gender = newGender;
    this.Apply({ Gender: newGender });
  }
}
